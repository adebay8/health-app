import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as jose from 'jose';
import {
  RedoxTokenResponse,
  CachedToken,
} from './interfaces/redox-token.interface';
import {
  RedoxPatientSearchParams,
  PatientSearchResult,
} from './interfaces/redox-patient-search.interface';
import { FhirBundle, FhirPatient } from './interfaces/fhir-patient.interface';
import {
  FhirMedicationBundle,
  FhirMedicationRequest,
  MedicationResult,
} from './interfaces/fhir-medication.interface';
import {
  FhirConditionBundle,
  FhirCondition,
  ConditionResult,
} from './interfaces/fhir-condition.interface';
import {
  FhirAllergyBundle,
  FhirAllergyIntolerance,
  AllergyResult,
} from './interfaces/fhir-allergy.interface';
import {
  FhirObservationBundle,
  FhirObservation,
  ObservationResult,
} from './interfaces/fhir-observation.interface';
import {
  FhirImmunizationBundle,
  FhirImmunization,
  ImmunizationResult,
} from './interfaces/fhir-immunization.interface';
import {
  FhirProcedureBundle,
  FhirProcedure,
  ProcedureResult,
} from './interfaces/fhir-procedure.interface';
import {
  FhirEncounterBundle,
  FhirEncounter,
  EncounterResult,
} from './interfaces/fhir-encounter.interface';
import {
  FhirDiagnosticReportBundle,
  FhirDiagnosticReport,
  DiagnosticReportResult,
} from './interfaces/fhir-diagnostic-report.interface';
import {
  FhirCarePlanBundle,
  FhirCarePlan,
  CarePlanResult,
} from './interfaces/fhir-care-plan.interface';
import {
  FhirDocumentReferenceBundle,
  FhirDocumentReference,
  DocumentReferenceResult,
} from './interfaces/fhir-document-reference.interface';
import {
  FhirGoalBundle,
  FhirGoal,
  GoalResult,
} from './interfaces/fhir-goal.interface';
import {
  FhirCareTeamBundle,
  FhirCareTeam,
  CareTeamResult,
} from './interfaces/fhir-care-team.interface';
import {
  FhirFamilyMemberHistoryBundle,
  FhirFamilyMemberHistory,
  FamilyMemberHistoryResult,
} from './interfaces/fhir-family-history.interface';
import {
  FhirMedicationAdministrationBundle,
  FhirMedicationAdministration,
  MedicationAdministrationResult,
} from './interfaces/fhir-medication-administration.interface';
import {
  FhirMedicationStatementBundle,
  FhirMedicationStatement,
  MedicationStatementResult,
} from './interfaces/fhir-medication-statement.interface';
import { REDOX_CONSTANTS } from './constants/redox.constants';

@Injectable()
export class RedoxService implements OnModuleInit {
  private readonly logger = new Logger(RedoxService.name);
  private cachedToken: CachedToken | null = null;
  private privateKey: string;
  private kid: string;
  private clientId: string;
  private tokenEndpoint: string;
  private fhirBaseUrl: string;
  private orgId: string;
  private env: string;
  private sourceId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    const privateKeyEnv = this.configService.get<string>('REDOX_PRIVATE_KEY');
    if (privateKeyEnv) {
      this.privateKey = privateKeyEnv;
    } else {
      const privateKeyPath = this.configService.get<string>(
        'REDOX_PRIVATE_KEY_PATH',
        path.join(process.cwd(), 'private key.pem'),
      );
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    }

    const jwkEnv = this.configService.get<string>('REDOX_PRIVATE_KEY_JWK');
    const jwk = jwkEnv
      ? JSON.parse(jwkEnv)
      : JSON.parse(
          fs.readFileSync(
            this.configService.get<string>(
              'REDOX_PRIVATE_KEY_JWK_PATH',
              path.join(process.cwd(), 'private keyjwk.json'),
            ),
            'utf8',
          ),
        );
    this.kid = jwk.kid;

    this.clientId = this.configService.getOrThrow<string>('REDOX_CLIENT_ID');
    this.tokenEndpoint = this.configService.get<string>(
      'REDOX_TOKEN_ENDPOINT',
      'https://api.redoxengine.com/v2/auth/token',
    );
    this.fhirBaseUrl = this.configService.get<string>(
      'REDOX_FHIR_BASE_URL',
      'https://api.redoxengine.com/fhir/R4',
    );
    this.orgId = this.configService.getOrThrow<string>('REDOX_ORG_ID');
    this.env = this.configService.get<string>('REDOX_ENV', 'Development');
    this.sourceId = this.configService.getOrThrow<string>('REDOX_SOURCE_ID');

    this.logger.log('Redox configuration loaded successfully');
  }

  async getAccessToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.cachedToken!.accessToken;
    }
    return this.refreshToken();
  }

  private isTokenValid(): boolean {
    if (!this.cachedToken) {
      return false;
    }
    const now = new Date();
    const bufferMs = REDOX_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS * 1000;
    return this.cachedToken.expiresAt.getTime() - bufferMs > now.getTime();
  }

  private async generateClientAssertion(): Promise<string> {
    const privateKey = await jose.importPKCS8(this.privateKey, 'RS384');

    const signedAssertion = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'RS384', kid: this.kid })
      .setAudience(this.tokenEndpoint)
      .setIssuer(this.clientId)
      .setSubject(this.clientId)
      .setIssuedAt(Math.floor(Date.now() / 1000))
      .setJti(randomBytes(8).toString('hex'))
      .sign(privateKey);

    return signedAssertion;
  }

  private async refreshToken(): Promise<string> {
    this.logger.debug('Refreshing Redox access token');

    const clientAssertion = await this.generateClientAssertion();

    const params = new URLSearchParams();
    params.append('grant_type', REDOX_CONSTANTS.GRANT_TYPE);
    params.append('client_assertion_type', REDOX_CONSTANTS.CLIENT_ASSERTION_TYPE);
    params.append('client_assertion', clientAssertion);

    try {
      const response = await firstValueFrom(
        this.httpService.post<RedoxTokenResponse>(
          this.tokenEndpoint,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const { access_token, expires_in } = response.data;

      this.cachedToken = {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };

      this.logger.debug(
        `Token refreshed, expires at ${this.cachedToken.expiresAt.toISOString()}`,
      );

      return access_token;
    } catch (error) {
      this.logger.error('Failed to refresh Redox token', error);
      throw new Error('Failed to authenticate with Redox API');
    }
  }

  private buildSearchUrl(resource: string): string {
    return `${this.fhirBaseUrl}/redox-fhir-sandbox/${this.env}/${resource}/_search`;
  }

  private async fhirSearch<T>(
    resource: string,
    searchParams: URLSearchParams,
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await firstValueFrom(
      this.httpService.post<T>(
        this.buildSearchUrl(resource),
        searchParams.toString(),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'redox-source-id': this.sourceId,
          },
        },
      ),
    );

    return response.data;
  }

  // ── Patient Search ──

  async searchPatients(
    params: RedoxPatientSearchParams,
  ): Promise<PatientSearchResult[]> {
    const token = await this.getAccessToken();

    const searchParams = new URLSearchParams();
    searchParams.append('given', params.given);
    searchParams.append('family', params.family);
    searchParams.append('birthdate', params.birthdate);

    if (params.gender) {
      searchParams.append('gender', params.gender);
    }
    if (params.identifier) {
      searchParams.append('identifier', params.identifier);
    }
    if (params.address) {
      searchParams.append('address', params.address);
    }
    if (params.telecom) {
      searchParams.append('telecom', params.telecom);
    }

    const url = `${this.fhirBaseUrl}/redox-fhir-sandbox/${this.env}/Patient/_search`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<FhirBundle>(url, searchParams.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'redox-source-id': this.sourceId,
          },
        }),
      );

      return this.transformFhirBundle(response.data);
    } catch (error) {
      this.logger.error('Patient search failed', JSON.stringify(error.response?.data || error.message));
      throw new Error('Failed to search patients in Redox');
    }
  }

  private transformFhirBundle(bundle: FhirBundle): PatientSearchResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'Patient')
      .map((entry) => this.transformFhirPatient(entry.resource));
  }

  private transformFhirPatient(patient: FhirPatient): PatientSearchResult {
    const officialName =
      patient.name?.find((n) => n.use === 'official') || patient.name?.[0];

    const phone = patient.telecom?.find((t) => t.system === 'phone');
    const email = patient.telecom?.find((t) => t.system === 'email');
    const homeAddress =
      patient.address?.find((a) => a.use === 'home') || patient.address?.[0];

    return {
      id: patient.id || '',
      firstName: officialName?.given?.join(' ') || '',
      lastName: officialName?.family || '',
      dateOfBirth: patient.birthDate || '',
      gender: patient.gender,
      identifiers: patient.identifier?.map((id) => ({
        system: id.system || '',
        value: id.value || '',
      })),
      phone: phone?.value,
      email: email?.value,
      address: homeAddress
        ? {
            line: homeAddress.line,
            city: homeAddress.city,
            state: homeAddress.state,
            postalCode: homeAddress.postalCode,
          }
        : undefined,
    };
  }

  // ── Medications (MedicationRequest) ──

  async searchMedications(
    patientId: string,
    intent?: string,
  ): Promise<MedicationResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    searchParams.append('intent', intent || 'order');

    try {
      const bundle = await this.fhirSearch<FhirMedicationBundle>(
        'MedicationRequest',
        searchParams,
      );
      return this.transformMedicationBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Medication search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search medications in Redox');
    }
  }

  private transformMedicationBundle(
    bundle: FhirMedicationBundle,
  ): MedicationResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'MedicationRequest')
      .map((entry) => this.transformMedicationRequest(entry.resource));
  }

  private transformMedicationRequest(
    medication: FhirMedicationRequest,
  ): MedicationResult {
    const coding = medication.medicationCodeableConcept?.coding?.[0];
    const dosage = medication.dosageInstruction?.[0];
    const doseQuantity = dosage?.doseAndRate?.[0]?.doseQuantity;

    return {
      id: medication.id || '',
      name: medication.medicationCodeableConcept?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      status: medication.status,
      dosage:
        doseQuantity || dosage?.route || dosage?.timing
          ? {
              value: doseQuantity?.value,
              unit: doseQuantity?.unit,
              route: dosage?.route?.text || dosage?.route?.coding?.[0]?.display,
              frequency:
                dosage?.timing?.code?.text ||
                dosage?.timing?.code?.coding?.[0]?.display,
            }
          : undefined,
      authoredOn: medication.authoredOn,
    };
  }

  // ── Conditions ──

  async searchConditions(
    patientId: string,
    clinicalStatus?: string,
  ): Promise<ConditionResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (clinicalStatus) {
      searchParams.append('clinical-status', clinicalStatus);
    }

    try {
      const bundle = await this.fhirSearch<FhirConditionBundle>(
        'Condition',
        searchParams,
      );
      return this.transformConditionBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Condition search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search conditions in Redox');
    }
  }

  private transformConditionBundle(
    bundle: FhirConditionBundle,
  ): ConditionResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'Condition')
      .map((entry) => this.transformCondition(entry.resource));
  }

  private transformCondition(condition: FhirCondition): ConditionResult {
    const coding = condition.code?.coding?.[0];

    return {
      id: condition.id || '',
      name: condition.code?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      clinicalStatus:
        condition.clinicalStatus?.coding?.[0]?.code ||
        condition.clinicalStatus?.text,
      verificationStatus:
        condition.verificationStatus?.coding?.[0]?.code ||
        condition.verificationStatus?.text,
      category:
        condition.category?.[0]?.coding?.[0]?.display ||
        condition.category?.[0]?.text,
      severity:
        condition.severity?.coding?.[0]?.display || condition.severity?.text,
      onsetDate: condition.onsetDateTime || condition.onsetPeriod?.start,
      abatementDate: condition.abatementDateTime,
      recordedDate: condition.recordedDate,
    };
  }

  // ── Allergies ──

  async searchAllergies(
    patientId: string,
    clinicalStatus?: string,
  ): Promise<AllergyResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (clinicalStatus) {
      searchParams.append('clinical-status', clinicalStatus);
    }

    try {
      const bundle = await this.fhirSearch<FhirAllergyBundle>(
        'AllergyIntolerance',
        searchParams,
      );
      return this.transformAllergyBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Allergy search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search allergies in Redox');
    }
  }

  private transformAllergyBundle(
    bundle: FhirAllergyBundle,
  ): AllergyResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter(
        (entry) => entry.resource?.resourceType === 'AllergyIntolerance',
      )
      .map((entry) => this.transformAllergy(entry.resource));
  }

  private transformAllergy(
    allergy: FhirAllergyIntolerance,
  ): AllergyResult {
    const coding = allergy.code?.coding?.[0];

    return {
      id: allergy.id || '',
      substance: allergy.code?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      clinicalStatus:
        allergy.clinicalStatus?.coding?.[0]?.code ||
        allergy.clinicalStatus?.text,
      type: allergy.type,
      category: allergy.category?.[0],
      criticality: allergy.criticality,
      onsetDate: allergy.onsetDateTime,
      recordedDate: allergy.recordedDate,
      reactions: allergy.reaction?.map((r) => ({
        manifestation:
          r.manifestation?.[0]?.text ||
          r.manifestation?.[0]?.coding?.[0]?.display ||
          '',
        severity: r.severity,
      })),
    };
  }

  // ── Observations (Vitals, Labs, Social History) ──

  async searchObservations(
    patientId: string,
    category?: string,
    code?: string,
  ): Promise<ObservationResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (category) {
      searchParams.append('category', category);
    }
    if (code) {
      searchParams.append('code', code);
    }

    try {
      const bundle = await this.fhirSearch<FhirObservationBundle>(
        'Observation',
        searchParams,
      );
      return this.transformObservationBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Observation search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search observations in Redox');
    }
  }

  private transformObservationBundle(
    bundle: FhirObservationBundle,
  ): ObservationResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'Observation')
      .map((entry) => this.transformObservation(entry.resource));
  }

  private transformObservation(
    observation: FhirObservation,
  ): ObservationResult {
    const coding = observation.code?.coding?.[0];

    let value: string | number | undefined;
    let unit: string | undefined;

    if (observation.valueQuantity) {
      value = observation.valueQuantity.value;
      unit = observation.valueQuantity.unit;
    } else if (observation.valueString) {
      value = observation.valueString;
    } else if (observation.valueCodeableConcept) {
      value =
        observation.valueCodeableConcept.text ||
        observation.valueCodeableConcept.coding?.[0]?.display;
    }

    const refRange = observation.referenceRange?.[0];
    let referenceRange: string | undefined;
    if (refRange?.text) {
      referenceRange = refRange.text;
    } else if (refRange?.low || refRange?.high) {
      const low = refRange.low
        ? `${refRange.low.value} ${refRange.low.unit || ''}`
        : '';
      const high = refRange.high
        ? `${refRange.high.value} ${refRange.high.unit || ''}`
        : '';
      referenceRange = `${low} - ${high}`.trim();
    }

    return {
      id: observation.id || '',
      name: observation.code?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      status: observation.status,
      category:
        observation.category?.[0]?.coding?.[0]?.code ||
        observation.category?.[0]?.text,
      value,
      unit,
      interpretation:
        observation.interpretation?.[0]?.coding?.[0]?.display ||
        observation.interpretation?.[0]?.text,
      referenceRange,
      effectiveDate:
        observation.effectiveDateTime || observation.effectivePeriod?.start,
      components: observation.component?.map((c) => ({
        name: c.code?.text || c.code?.coding?.[0]?.display || '',
        value: c.valueQuantity?.value ?? c.valueString,
        unit: c.valueQuantity?.unit,
      })),
    };
  }

  // ── Immunizations ──

  async searchImmunizations(
    patientId: string,
    status?: string,
  ): Promise<ImmunizationResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (status) {
      searchParams.append('status', status);
    }

    try {
      const bundle = await this.fhirSearch<FhirImmunizationBundle>(
        'Immunization',
        searchParams,
      );
      return this.transformImmunizationBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Immunization search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search immunizations in Redox');
    }
  }

  private transformImmunizationBundle(
    bundle: FhirImmunizationBundle,
  ): ImmunizationResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'Immunization')
      .map((entry) => this.transformImmunization(entry.resource));
  }

  private transformImmunization(
    immunization: FhirImmunization,
  ): ImmunizationResult {
    const coding = immunization.vaccineCode?.coding?.[0];

    return {
      id: immunization.id || '',
      vaccineName:
        immunization.vaccineCode?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      status: immunization.status,
      occurrenceDate: immunization.occurrenceDateTime,
      lotNumber: immunization.lotNumber,
      site:
        immunization.site?.text ||
        immunization.site?.coding?.[0]?.display,
      route:
        immunization.route?.text ||
        immunization.route?.coding?.[0]?.display,
    };
  }

  // ── Procedures ──

  async searchProcedures(
    patientId: string,
    status?: string,
  ): Promise<ProcedureResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (status) {
      searchParams.append('status', status);
    }

    try {
      const bundle = await this.fhirSearch<FhirProcedureBundle>(
        'Procedure',
        searchParams,
      );
      return this.transformProcedureBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Procedure search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search procedures in Redox');
    }
  }

  private transformProcedureBundle(
    bundle: FhirProcedureBundle,
  ): ProcedureResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'Procedure')
      .map((entry) => this.transformProcedure(entry.resource));
  }

  private transformProcedure(procedure: FhirProcedure): ProcedureResult {
    const coding = procedure.code?.coding?.[0];

    return {
      id: procedure.id || '',
      name: procedure.code?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      status: procedure.status,
      performedDate:
        procedure.performedDateTime || procedure.performedPeriod?.start,
      performer: procedure.performer?.[0]?.actor?.display,
      reason:
        procedure.reasonCode?.[0]?.text ||
        procedure.reasonCode?.[0]?.coding?.[0]?.display,
    };
  }

  // ── Encounters ──

  async searchEncounters(
    patientId: string,
    status?: string,
  ): Promise<EncounterResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (status) {
      searchParams.append('status', status);
    }

    try {
      const bundle = await this.fhirSearch<FhirEncounterBundle>(
        'Encounter',
        searchParams,
      );
      return this.transformEncounterBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Encounter search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search encounters in Redox');
    }
  }

  private transformEncounterBundle(
    bundle: FhirEncounterBundle,
  ): EncounterResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'Encounter')
      .map((entry) => this.transformEncounter(entry.resource));
  }

  private transformEncounter(encounter: FhirEncounter): EncounterResult {
    return {
      id: encounter.id || '',
      status: encounter.status,
      class: encounter.class?.display || encounter.class?.code,
      type:
        encounter.type?.[0]?.text ||
        encounter.type?.[0]?.coding?.[0]?.display,
      reason:
        encounter.reasonCode?.[0]?.text ||
        encounter.reasonCode?.[0]?.coding?.[0]?.display,
      startDate: encounter.period?.start,
      endDate: encounter.period?.end,
      location: encounter.location?.[0]?.location?.display,
      participant: encounter.participant?.[0]?.individual?.display,
    };
  }

  // ── Diagnostic Reports ──

  async searchDiagnosticReports(
    patientId: string,
    category?: string,
  ): Promise<DiagnosticReportResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (category) {
      searchParams.append('category', category);
    }

    try {
      const bundle = await this.fhirSearch<FhirDiagnosticReportBundle>(
        'DiagnosticReport',
        searchParams,
      );
      return this.transformDiagnosticReportBundle(bundle);
    } catch (error) {
      this.logger.error(
        'DiagnosticReport search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search diagnostic reports in Redox');
    }
  }

  private transformDiagnosticReportBundle(
    bundle: FhirDiagnosticReportBundle,
  ): DiagnosticReportResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter(
        (entry) => entry.resource?.resourceType === 'DiagnosticReport',
      )
      .map((entry) => this.transformDiagnosticReport(entry.resource));
  }

  private transformDiagnosticReport(
    report: FhirDiagnosticReport,
  ): DiagnosticReportResult {
    const coding = report.code?.coding?.[0];

    return {
      id: report.id || '',
      name: report.code?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      status: report.status,
      category:
        report.category?.[0]?.coding?.[0]?.display ||
        report.category?.[0]?.text,
      effectiveDate:
        report.effectiveDateTime || report.effectivePeriod?.start,
      issued: report.issued,
      conclusion: report.conclusion,
      resultReferences: report.result?.map((r) => r.reference || ''),
    };
  }

  // ── Care Plans ──

  async searchCarePlans(
    patientId: string,
    status?: string,
  ): Promise<CarePlanResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (status) {
      searchParams.append('status', status);
    }

    try {
      const bundle = await this.fhirSearch<FhirCarePlanBundle>(
        'CarePlan',
        searchParams,
      );
      return this.transformCarePlanBundle(bundle);
    } catch (error) {
      this.logger.error(
        'CarePlan search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search care plans in Redox');
    }
  }

  private transformCarePlanBundle(
    bundle: FhirCarePlanBundle,
  ): CarePlanResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'CarePlan')
      .map((entry) => this.transformCarePlan(entry.resource));
  }

  private transformCarePlan(carePlan: FhirCarePlan): CarePlanResult {
    return {
      id: carePlan.id || '',
      title: carePlan.title,
      description: carePlan.description,
      status: carePlan.status,
      intent: carePlan.intent,
      category:
        carePlan.category?.[0]?.coding?.[0]?.display ||
        carePlan.category?.[0]?.text,
      startDate: carePlan.period?.start,
      endDate: carePlan.period?.end,
      activities: carePlan.activity?.map((a) => ({
        name:
          a.detail?.code?.text ||
          a.detail?.code?.coding?.[0]?.display,
        status: a.detail?.status,
        description: a.detail?.description,
      })),
    };
  }

  // ── Document References ──

  async searchDocumentReferences(
    patientId: string,
    type?: string,
  ): Promise<DocumentReferenceResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (type) {
      searchParams.append('type', type);
    }

    try {
      const bundle = await this.fhirSearch<FhirDocumentReferenceBundle>(
        'DocumentReference',
        searchParams,
      );
      return this.transformDocumentReferenceBundle(bundle);
    } catch (error) {
      this.logger.error(
        'DocumentReference search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search document references in Redox');
    }
  }

  private transformDocumentReferenceBundle(
    bundle: FhirDocumentReferenceBundle,
  ): DocumentReferenceResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter(
        (entry) => entry.resource?.resourceType === 'DocumentReference',
      )
      .map((entry) => this.transformDocumentReference(entry.resource));
  }

  private transformDocumentReference(
    doc: FhirDocumentReference,
  ): DocumentReferenceResult {
    return {
      id: doc.id || '',
      type: doc.type?.text || doc.type?.coding?.[0]?.display,
      category:
        doc.category?.[0]?.text ||
        doc.category?.[0]?.coding?.[0]?.display,
      status: doc.status,
      date: doc.date,
      author: doc.author?.[0]?.display,
      description: doc.description,
      content: doc.content?.map((c) => ({
        contentType: c.attachment?.contentType,
        url: c.attachment?.url,
        title: c.attachment?.title,
      })),
    };
  }

  // ── Goals ──

  async searchGoals(
    patientId: string,
    lifecycleStatus?: string,
  ): Promise<GoalResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (lifecycleStatus) {
      searchParams.append('lifecycle-status', lifecycleStatus);
    }

    try {
      const bundle = await this.fhirSearch<FhirGoalBundle>(
        'Goal',
        searchParams,
      );
      return this.transformGoalBundle(bundle);
    } catch (error) {
      this.logger.error(
        'Goal search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search goals in Redox');
    }
  }

  private transformGoalBundle(bundle: FhirGoalBundle): GoalResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'Goal')
      .map((entry) => this.transformGoal(entry.resource));
  }

  private transformGoal(goal: FhirGoal): GoalResult {
    return {
      id: goal.id || '',
      description:
        goal.description?.text ||
        goal.description?.coding?.[0]?.display ||
        '',
      lifecycleStatus: goal.lifecycleStatus,
      achievementStatus:
        goal.achievementStatus?.coding?.[0]?.display ||
        goal.achievementStatus?.text,
      startDate: goal.startDate,
      targets: goal.target?.map((t) => ({
        measure:
          t.measure?.text || t.measure?.coding?.[0]?.display,
        targetValue: t.detailQuantity?.value,
        unit: t.detailQuantity?.unit,
        dueDate: t.dueDate,
      })),
    };
  }

  // ── Care Teams ──

  async searchCareTeams(
    patientId: string,
    status?: string,
  ): Promise<CareTeamResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (status) {
      searchParams.append('status', status);
    }

    try {
      const bundle = await this.fhirSearch<FhirCareTeamBundle>(
        'CareTeam',
        searchParams,
      );
      return this.transformCareTeamBundle(bundle);
    } catch (error) {
      this.logger.error(
        'CareTeam search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search care teams in Redox');
    }
  }

  private transformCareTeamBundle(
    bundle: FhirCareTeamBundle,
  ): CareTeamResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter((entry) => entry.resource?.resourceType === 'CareTeam')
      .map((entry) => this.transformCareTeam(entry.resource));
  }

  private transformCareTeam(careTeam: FhirCareTeam): CareTeamResult {
    return {
      id: careTeam.id || '',
      name: careTeam.name,
      status: careTeam.status,
      startDate: careTeam.period?.start,
      endDate: careTeam.period?.end,
      participants: careTeam.participant?.map((p) => ({
        name: p.member?.display,
        role:
          p.role?.[0]?.text || p.role?.[0]?.coding?.[0]?.display,
      })),
    };
  }

  // ── Family Member History ──

  async searchFamilyHistory(
    patientId: string,
  ): Promise<FamilyMemberHistoryResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);

    try {
      const bundle = await this.fhirSearch<FhirFamilyMemberHistoryBundle>(
        'FamilyMemberHistory',
        searchParams,
      );
      return this.transformFamilyHistoryBundle(bundle);
    } catch (error) {
      this.logger.error(
        'FamilyMemberHistory search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search family history in Redox');
    }
  }

  private transformFamilyHistoryBundle(
    bundle: FhirFamilyMemberHistoryBundle,
  ): FamilyMemberHistoryResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter(
        (entry) =>
          entry.resource?.resourceType === 'FamilyMemberHistory',
      )
      .map((entry) => this.transformFamilyHistory(entry.resource));
  }

  private transformFamilyHistory(
    history: FhirFamilyMemberHistory,
  ): FamilyMemberHistoryResult {
    return {
      id: history.id || '',
      status: history.status,
      relationship:
        history.relationship?.text ||
        history.relationship?.coding?.[0]?.display,
      sex: history.sex?.text || history.sex?.coding?.[0]?.display,
      conditions: history.condition?.map((c) => ({
        name: c.code?.text || c.code?.coding?.[0]?.display || '',
        outcome:
          c.outcome?.text || c.outcome?.coding?.[0]?.display,
        onsetAge: c.onsetAge?.value,
      })),
    };
  }

  // ── Medication Administrations ──

  async searchMedicationAdministrations(
    patientId: string,
    status?: string,
  ): Promise<MedicationAdministrationResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (status) {
      searchParams.append('status', status);
    }

    try {
      const bundle =
        await this.fhirSearch<FhirMedicationAdministrationBundle>(
          'MedicationAdministration',
          searchParams,
        );
      return this.transformMedicationAdministrationBundle(bundle);
    } catch (error) {
      this.logger.error(
        'MedicationAdministration search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error(
        'Failed to search medication administrations in Redox',
      );
    }
  }

  private transformMedicationAdministrationBundle(
    bundle: FhirMedicationAdministrationBundle,
  ): MedicationAdministrationResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter(
        (entry) =>
          entry.resource?.resourceType === 'MedicationAdministration',
      )
      .map((entry) =>
        this.transformMedicationAdministration(entry.resource),
      );
  }

  private transformMedicationAdministration(
    admin: FhirMedicationAdministration,
  ): MedicationAdministrationResult {
    const coding = admin.medicationCodeableConcept?.coding?.[0];

    return {
      id: admin.id || '',
      name:
        admin.medicationCodeableConcept?.text || coding?.display || '',
      code: coding?.code,
      system: coding?.system,
      status: admin.status,
      effectiveDate:
        admin.effectiveDateTime || admin.effectivePeriod?.start,
      dosage: admin.dosage
        ? {
            value: admin.dosage.dose?.value,
            unit: admin.dosage.dose?.unit,
            route:
              admin.dosage.route?.text ||
              admin.dosage.route?.coding?.[0]?.display,
          }
        : undefined,
    };
  }

  // ── Medication Statements ──

  async searchMedicationStatements(
    patientId: string,
    status?: string,
  ): Promise<MedicationStatementResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('patient', `Patient/${patientId}`);
    if (status) {
      searchParams.append('status', status);
    }

    try {
      const bundle = await this.fhirSearch<FhirMedicationStatementBundle>(
        'MedicationStatement',
        searchParams,
      );
      return this.transformMedicationStatementBundle(bundle);
    } catch (error) {
      this.logger.error(
        'MedicationStatement search failed',
        JSON.stringify(error.response?.data || error.message),
      );
      throw new Error('Failed to search medication statements in Redox');
    }
  }

  private transformMedicationStatementBundle(
    bundle: FhirMedicationStatementBundle,
  ): MedicationStatementResult[] {
    if (!bundle.entry || bundle.entry.length === 0) {
      return [];
    }

    return bundle.entry
      .filter(
        (entry) =>
          entry.resource?.resourceType === 'MedicationStatement',
      )
      .map((entry) =>
        this.transformMedicationStatement(entry.resource),
      );
  }

  private transformMedicationStatement(
    statement: FhirMedicationStatement,
  ): MedicationStatementResult {
    const coding = statement.medicationCodeableConcept?.coding?.[0];

    return {
      id: statement.id || '',
      name:
        statement.medicationCodeableConcept?.text ||
        coding?.display ||
        '',
      code: coding?.code,
      system: coding?.system,
      status: statement.status,
      effectiveDate:
        statement.effectiveDateTime || statement.effectivePeriod?.start,
      dateAsserted: statement.dateAsserted,
      dosage: statement.dosage?.[0]?.text,
    };
  }
}
