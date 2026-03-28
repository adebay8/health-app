import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { ParticleAuthService } from './particle-auth.service';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { GetPatientDataDto } from './dto/get-patient-data.dto';
import { ParticlePatientResponse } from './interfaces/particle-patient.interface';
import { ParticleQueryResponse } from './interfaces/particle-query.interface';

@Injectable()
export class ParticleService {
  private readonly logger = new Logger(ParticleService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: ParticleAuthService,
  ) {}

  async registerPatient(dto: RegisterPatientDto): Promise<ParticlePatientResponse> {
    const body: Record<string, any> = {
      given_name: dto.firstName,
      family_name: dto.lastName,
      date_of_birth: dto.dateOfBirth,
      gender: dto.gender,
      address_city: dto.city,
      address_state: dto.state,
      postal_code: dto.zipCode,
      patient_id: dto.patientId,
    };

    if (dto.addressLines) body.address_lines = dto.addressLines;
    if (dto.email) body.email = dto.email;
    if (dto.phone) body.phone = dto.phone;

    return this.particleRequest<ParticlePatientResponse>('POST', '/api/v2/patients', body);
  }

  async launchQuery(
    particlePatientId: string,
    purposeOfUse: string = 'TREATMENT',
  ): Promise<ParticleQueryResponse> {
    return this.particleRequest<ParticleQueryResponse>(
      'POST',
      `/api/v2/patients/${particlePatientId}/query`,
      { purpose_of_use: purposeOfUse },
    );
  }

  async getQueryStatus(
    particlePatientId: string,
  ): Promise<ParticleQueryResponse> {
    return this.particleRequest<ParticleQueryResponse>(
      'GET',
      `/api/v2/patients/${particlePatientId}/query`,
    );
  }

  async getPatientData(
    particlePatientId: string,
    dto: GetPatientDataDto,
  ): Promise<any> {
    const format = dto.format || 'fhir';
    const formatPath = format === 'ccda' ? 'ccda' : format === 'flat' ? 'flat' : 'fhir';
    let path = `/api/v2/patients/${particlePatientId}/${formatPath}`;

    const params: Record<string, string> = {};
    if (dto.since) {
      params.since = dto.since;
    }
    if (dto.fileId) {
      params.file_id = dto.fileId;
    }

    return this.particleRequest<any>('GET', path, undefined, params);
  }

  async getFile(queryId: string, fileId: string): Promise<any> {
    return this.particleRequest<any>('GET', `/api/v1/files/${queryId}/${fileId}`);
  }

  async deletePatient(particlePatientId: string): Promise<any> {
    return this.particleRequest<any>(
      'DELETE',
      `/api/v1/patients/${particlePatientId}`,
    );
  }

  private async particleRequest<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, string>,
  ): Promise<T> {
    try {
      const token = await this.authService.getAccessToken();
      const baseUrl = this.authService.getBaseUrl();
      const url = `${baseUrl}${path}`;

      const config: AxiosRequestConfig = {
        method,
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(data && { data }),
        ...(params && { params }),
      };

      const response = await firstValueFrom(
        this.httpService.request<T>(config),
      );
      return response.data;
    } catch (error) {
      const axiosResponse = error.response?.data ?? error.response;
      const status = error.response?.status || error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const errorDetail =
        axiosResponse?.message ||
        axiosResponse?.error ||
        axiosResponse?.error_description ||
        error.message ||
        'Particle API request failed';

      this.logger.error(
        `Particle API error: ${method} ${path} - ${status}: ${JSON.stringify(axiosResponse || error.message)}`,
      );

      throw new HttpException(
        { message: errorDetail, particlePath: path, detail: axiosResponse },
        status,
      );
    }
  }
}
