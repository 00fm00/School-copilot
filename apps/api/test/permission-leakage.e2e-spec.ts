import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { seedDatabase } from '../src/seed/seed';

import mongoose from 'mongoose';

describe('Permission Leakage & Security E2E', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let server: any;

  beforeAll(async () => {
    // 1. Start in-memory Mongo first
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.JWT_ACCESS_SECRET = 'test-e2e-access-secret-minimum-32-chars-long';
    process.env.JWT_REFRESH_SECRET = 'test-e2e-refresh-secret-minimum-32-chars-long';
    process.env.RETRIEVAL_MIN_SCORE = '0.35';

    // 2. Dynamically import AppModule now that environment is populated
    const { AppModule } = await import('../src/app.module');

    // 3. Seed data into the in-memory Mongo instance
    await seedDatabase(uri);

    // 4. Create NestJS App
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    server = app.getHttpServer();
  }, 120000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  async function loginAs(email: string): Promise<string> {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(200);
    return res.body.accessToken;
  }

  async function createSession(token: string, title = 'E2E Session'): Promise<string> {
    const res = await request(server)
      .post('/api/chat/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ title })
      .expect(201);
    return res.body.id;
  }

  it('1. Parent accessing teacher-only Staff Handbook must be refused (Zero Permission Leakage)', async () => {
    const token = await loginAs('parent.smith@school.local');
    const sessionId = await createSession(token);

    const res = await request(server)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content:
          'What does the Staff Handbook say about internal teacher performance bonuses and salary reviews?',
      })
      .expect(200);

    expect(res.body.refused).toBe(true);
    expect(res.body.citations).toHaveLength(0);
    expect(res.body.message.content).toContain(
      'I could not find this in the documents available to you.',
    );
  });

  it('2. Parent of Class 6 accessing Class 8 Circular must be refused (Zero Class Scope Leakage)', async () => {
    const token = await loginAs('parent.doe@school.local'); // child in Class 6-A
    const sessionId = await createSession(token);

    const res = await request(server)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content:
          'What are the questions and exam timings on the Class 8 Mathematics exam circular?',
      })
      .expect(200);

    expect(res.body.refused).toBe(true);
    expect(res.body.citations).toHaveLength(0);
  });

  it('3. Teacher not in Class 8 accessing Class 8 Circular must be refused', async () => {
    const token = await loginAs('teacher.english@school.local'); // assigned to Class 6-A only
    const sessionId = await createSession(token);

    const res = await request(server)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'What is the syllabus for the Class 8 Mathematics midterm exam?',
      })
      .expect(200);

    expect(res.body.refused).toBe(true);
    expect(res.body.citations).toHaveLength(0);
  });

  it('4. Teacher in Class 8 can successfully query Class 8 Circular with citations', async () => {
    const token = await loginAs('teacher.math@school.local'); // assigned to Class 8-A and 10-A
    const sessionId = await createSession(token);

    const res = await request(server)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'What is the syllabus for the Class 8 Mathematics midterm exam?',
      })
      .expect(200);

    expect(res.body.refused).toBe(false);
    expect(res.body.citations.length).toBeGreaterThan(0);
    expect(res.body.citations[0].title).toBe('Class 8 Exam Circular');
    expect(res.body.citations[0].page).toBe(1);
  });

  it('5. Parent with child in Class 8 can query Class 8 Circular with citations', async () => {
    const token = await loginAs('parent.smith@school.local'); // child in Class 8-A
    const sessionId = await createSession(token);

    const res = await request(server)
      .post(`/api/chat/sessions/${sessionId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: 'What are the exam timings and dates for Class 8 term exams?',
      })
      .expect(200);

    expect(res.body.refused).toBe(false);
    expect(res.body.citations.length).toBeGreaterThan(0);
    expect(res.body.citations[0].title).toBe('Class 8 Exam Circular');
  });

  it('6. Cross-user session access returns 404 (ID enumeration protection)', async () => {
    const parentSmithToken = await loginAs('parent.smith@school.local');
    const smithSessionId = await createSession(parentSmithToken, 'Smith Private Session');

    const parentDoeToken = await loginAs('parent.doe@school.local');

    // Attempting to read another user's session messages
    await request(server)
      .get(`/api/chat/sessions/${smithSessionId}/messages`)
      .set('Authorization', `Bearer ${parentDoeToken}`)
      .expect(404);

    // Attempting to post to another user's session
    await request(server)
      .post(`/api/chat/sessions/${smithSessionId}/messages`)
      .set('Authorization', `Bearer ${parentDoeToken}`)
      .send({ content: 'Sneaking into another chat' })
      .expect(404);

    // Attempting to delete another user's session
    await request(server)
      .delete(`/api/chat/sessions/${smithSessionId}`)
      .set('Authorization', `Bearer ${parentDoeToken}`)
      .expect(404);
  });

  it('7. Unauthenticated requests to protected endpoints return 401', async () => {
    await request(server).get('/api/chat/sessions').expect(401);
    await request(server).post('/api/documents').expect(401);
    await request(server).get('/api/classes').expect(401);
  });

  it('8. Non-admin users cannot access admin document upload endpoint (403 Forbidden)', async () => {
    const teacherToken = await loginAs('teacher.math@school.local');
    const parentToken = await loginAs('parent.smith@school.local');

    await request(server)
      .post('/api/documents')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403);

    await request(server)
      .post('/api/documents')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);
  });
});
