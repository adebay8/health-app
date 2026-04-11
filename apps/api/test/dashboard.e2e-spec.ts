import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SeedService } from '../src/seed/seed.service';

describe('Dashboard e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Seed once for the whole suite.
    const seeder = app.get(SeedService);
    await seeder.seed();
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // Helper — the live api uses a TransformInterceptor that wraps responses in
  // `{ success: true, data: ... }`. The e2e tests go through the same
  // interceptor because we use the real AppModule.
  function unwrap(body: any): any {
    return body?.data ?? body;
  }

  it('GET /api/v1/dashboard/patients returns three demo patients', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/patients')
      .expect(200);
    const data = unwrap(res.body);
    const names = data.map((p: any) => p.firstName).sort();
    expect(names).toEqual(['Carlos', 'Mia', 'Sarah']);
  });

  it('GET /api/v1/dashboard/patients/:id returns a full normalized payload for Carlos', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/dashboard/patients');
    const data = unwrap(list.body);
    const carlos = data.find((p: any) => p.firstName === 'Carlos');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard/patients/${carlos.id}`)
      .expect(200);
    const payload = unwrap(res.body);

    expect(payload.patient.firstName).toBe('Carlos');
    expect(payload.conditions.length).toBeGreaterThanOrEqual(3);
    expect(payload.medications.length).toBeGreaterThanOrEqual(3);
    // Carlos has 3 labs (LDL, A1C, glucose) + 1 BP panel that splits to 2 records = 5 observations
    expect(payload.observations.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/v1/dashboard/patients/:id/insights surfaces LDL, A1C, glucose, and BP flags for Carlos', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/dashboard/patients');
    const carlos = unwrap(list.body).find((p: any) => p.firstName === 'Carlos');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard/patients/${carlos.id}/insights`)
      .expect(200);
    const payload = unwrap(res.body);

    const metrics = payload.flags.map((f: any) => f.metric);
    expect(metrics).toEqual(
      expect.arrayContaining(['LDL', 'A1C', 'Fasting glucose', 'Blood pressure']),
    );
    expect(typeof payload.narration).toBe('string');
    expect(payload.narration.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/dashboard/patients/:id/insights returns zero or benign flags for Sarah', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/dashboard/patients');
    const sarah = unwrap(list.body).find((p: any) => p.firstName === 'Sarah');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/dashboard/patients/${sarah.id}/insights`)
      .expect(200);
    const payload = unwrap(res.body);

    // Sarah's BP is normal, LDL is normal, no diabetes labs. There may be an
    // info-level "preventive gap" flag if her last lipid was > 12 months old,
    // but nothing should be 'concern'.
    const concerns = payload.flags.filter((f: any) => f.severity === 'concern');
    expect(concerns).toEqual([]);
  });

  it('POST /api/v1/dashboard/patients/:id/ask returns a stub answer', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/dashboard/patients');
    const sarah = unwrap(list.body).find((p: any) => p.firstName === 'Sarah');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/dashboard/patients/${sarah.id}/ask`)
      .send({ question: 'Should I get a flu shot?' })
      .expect(201);
    const payload = unwrap(res.body);

    expect(typeof payload.answer).toBe('string');
    expect(payload.answer).toContain('Sarah');
  });

  it('POST /api/v1/dashboard/patients/:id/ask rejects an empty question', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/dashboard/patients');
    const sarah = unwrap(list.body).find((p: any) => p.firstName === 'Sarah');

    await request(app.getHttpServer())
      .post(`/api/v1/dashboard/patients/${sarah.id}/ask`)
      .send({ question: '' })
      .expect(400);
  });

  it('GET /api/v1/dashboard/patients/:id returns 404 for an unknown id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/dashboard/patients/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
