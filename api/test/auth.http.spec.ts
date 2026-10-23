import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { prismaMock, type PrismaMock } from './prisma-mock.js';

/**
 * The whole application over HTTP, with the guards for real, and a fake
 * Prisma in place of the database: login, 401, 403 by role, no DB needed.
 */
describe('Auth and roles, over HTTP', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let jwt: JwtService;

  const tokenFor = (role: 'ADMIN' | 'ENSEIGNANT' | 'ELEVE') => jwt.signAsync({ sub: 1, email: 'x@castelmont.fr', role });

  beforeAll(async () => {
    prisma = prismaMock();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.teacher.findMany.mockResolvedValue([]);
    prisma.student.findMany.mockResolvedValue([]);
  });

  it('GET /health answers 200 without a token', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('POST /auth/login returns a token for the right password', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'admin@castelmont.fr', role: 'ADMIN', passwordHash: hashPassword('soutenance2027') });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@castelmont.fr', password: 'soutenance2027' })
      .expect(200);

    expect(response.body.access_token.split('.')).toHaveLength(3);
  });

  it('POST /auth/login answers 401 for a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'admin@castelmont.fr', role: 'ADMIN', passwordHash: hashPassword('soutenance2027') });

    await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin@castelmont.fr', password: 'wrong' }).expect(401);
  });

  it('POST /auth/login answers 400 when the email is not an email', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin', password: 'x' }).expect(400);
  });

  it('GET /auth/whoami returns the payload of the token', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/whoami')
      .set('Authorization', `Bearer ${await tokenFor('ENSEIGNANT')}`)
      .expect(200);

    expect(response.body).toMatchObject({ sub: 1, role: 'ENSEIGNANT' });
  });

  it('answers 401 without a token, and with a forged one', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
    await request(app.getHttpServer()).get('/users').set('Authorization', 'Bearer not-a-token').expect(401);
  });

  it.each(['ENSEIGNANT', 'ELEVE'] as const)('answers 403 to %s on the admin routes', async (role) => {
    const token = await tokenFor(role);
    for (const path of ['/users', '/teachers', '/students']) {
      await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`).expect(403);
    }
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'ELEVE', personId: 1, password: 'soutenance2027' })
      .expect(403);
  });

  it('lets the ADMIN list accounts, teachers and students', async () => {
    const token = await tokenFor('ADMIN');
    for (const path of ['/users', '/teachers', '/students']) {
      await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`).expect(200);
    }
  });

  it('refuses to create an ADMIN account: only ENSEIGNANT and ELEVE', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${await tokenFor('ADMIN')}`)
      .send({ role: 'ADMIN', personId: 1, password: 'soutenance2027' })
      .expect(400);
  });

  it('refuses a password shorter than 8 characters', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${await tokenFor('ADMIN')}`)
      .send({ role: 'ELEVE', personId: 1, password: 'short' })
      .expect(400);
  });

  it('answers 409 when the person already has an account', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 1, email: 'lea@etu.castelmont.fr', userId: 9 });

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${await tokenFor('ADMIN')}`)
      .send({ role: 'ELEVE', personId: 1, password: 'soutenance2027' })
      .expect(409);
  });

  it('answers 404 for an unknown person', async () => {
    prisma.teacher.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${await tokenFor('ADMIN')}`)
      .send({ role: 'ENSEIGNANT', personId: 404, password: 'soutenance2027' })
      .expect(404);
  });
});
