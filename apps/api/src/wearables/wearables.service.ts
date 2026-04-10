import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WearableProvider } from './interfaces/wearable-provider.interface';
import { WEARABLE_PROVIDERS } from './constants/wearables.constants';
import { WearableProfile } from './entities/wearable-profile.entity';
import { HealthScore } from './entities/health-score.entity';
import { Biomarker } from './entities/biomarker.entity';
import { RegisterWearableProfileDto } from './dto/register-wearable-profile.dto';
import { LinkExistingProfileDto } from './dto/link-existing-profile.dto';
import { QueryHealthDataDto } from './dto/query-health-data.dto';

@Injectable()
export class WearablesService {
  private readonly logger = new Logger(WearablesService.name);

  constructor(
    @Inject(WEARABLE_PROVIDERS)
    private readonly providers: Map<string, WearableProvider>,
    @InjectRepository(WearableProfile)
    private readonly profileRepo: Repository<WearableProfile>,
    @InjectRepository(HealthScore)
    private readonly scoreRepo: Repository<HealthScore>,
    @InjectRepository(Biomarker)
    private readonly biomarkerRepo: Repository<Biomarker>,
  ) {}

  private getProvider(providerName: string): WearableProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new BadRequestException(
        `Unknown wearable provider: ${providerName}`,
      );
    }
    return provider;
  }

  async registerProfile(dto: RegisterWearableProfileDto) {
    const provider = this.getProvider(dto.providerName);

    const existing = await this.profileRepo.findOne({
      where: { patientId: dto.patientId, providerName: dto.providerName },
    });
    if (existing) {
      throw new ConflictException(
        `Patient already registered with ${dto.providerName}`,
      );
    }

    const result = await provider.registerProfile(dto.patientId);

    const profile = this.profileRepo.create({
      patientId: dto.patientId,
      providerName: dto.providerName,
      externalId: result.externalId,
      profileToken: result.profileToken,
    });

    return this.profileRepo.save(profile);
  }

  async linkExistingProfile(dto: LinkExistingProfileDto) {
    this.getProvider(dto.providerName); // validate provider exists

    const existing = await this.profileRepo.findOne({
      where: { patientId: dto.patientId, providerName: dto.providerName },
    });
    if (existing) {
      throw new ConflictException(
        `Patient already registered with ${dto.providerName}`,
      );
    }

    const profile = this.profileRepo.create({
      patientId: dto.patientId,
      providerName: dto.providerName,
      externalId: dto.externalId,
      profileToken: dto.profileToken,
    });

    return this.profileRepo.save(profile);
  }

  async getPatientProfiles(patientId: string) {
    return this.profileRepo.find({ where: { patientId, isActive: true } });
  }

  async getLiveScores(patientId: string, query: QueryHealthDataDto) {
    const profile = await this.getActiveProfile(
      patientId,
      query.providerName,
    );
    const provider = this.getProvider(profile.providerName);

    const types = query.types?.split(',').map((t) => t.trim());
    return provider.getHealthScores(profile.profileToken, types);
  }

  async getLiveBiomarkers(patientId: string, query: QueryHealthDataDto) {
    const profile = await this.getActiveProfile(
      patientId,
      query.providerName,
    );
    const provider = this.getProvider(profile.providerName);

    const categories = query.types?.split(',').map((t) => t.trim());
    return provider.getBiomarkers(
      profile.profileToken,
      categories,
      query.startDate,
      query.endDate,
    );
  }

  async getStoredScores(patientId: string, query: QueryHealthDataDto) {
    const qb = this.scoreRepo
      .createQueryBuilder('score')
      .where('score.patientId = :patientId', { patientId });

    if (query.providerName) {
      qb.andWhere('score.providerName = :providerName', {
        providerName: query.providerName,
      });
    }
    if (query.types) {
      const types = query.types.split(',').map((t) => t.trim());
      qb.andWhere('score.type IN (:...types)', { types });
    }
    if (query.startDate) {
      qb.andWhere('score.recordedAt >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      qb.andWhere('score.recordedAt <= :endDate', {
        endDate: query.endDate,
      });
    }

    qb.orderBy('score.recordedAt', 'DESC');
    return qb.getMany();
  }

  async getStoredBiomarkers(patientId: string, query: QueryHealthDataDto) {
    const qb = this.biomarkerRepo
      .createQueryBuilder('biomarker')
      .where('biomarker.patientId = :patientId', { patientId });

    if (query.providerName) {
      qb.andWhere('biomarker.providerName = :providerName', {
        providerName: query.providerName,
      });
    }
    if (query.types) {
      const categories = query.types.split(',').map((t) => t.trim());
      qb.andWhere('biomarker.category IN (:...categories)', { categories });
    }
    if (query.startDate) {
      qb.andWhere('biomarker.startDate >= :startDate', {
        startDate: query.startDate,
      });
    }
    if (query.endDate) {
      qb.andWhere('biomarker.endDate <= :endDate', {
        endDate: query.endDate,
      });
    }

    qb.orderBy('biomarker.startDate', 'DESC');
    return qb.getMany();
  }

  private async getActiveProfile(
    patientId: string,
    providerName?: string,
  ): Promise<WearableProfile> {
    const where: any = { patientId, isActive: true };
    if (providerName) {
      where.providerName = providerName;
    }

    const profile = await this.profileRepo.findOne({ where });
    if (!profile) {
      throw new NotFoundException(
        `No active wearable profile found for patient ${patientId}`,
      );
    }
    return profile;
  }
}
