import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { prismaMock } from './prisma-mock.js';

/**
 * Every protected route, called by each role: who gets through, who gets 403,
 * and 401 without a token. The guards run before the body is even read, so
 * no database is needed: a refused call never reaches the services.
 */

type Role = 'ADMIN' | 'ENSEIGNANT' | 'ELEVE';
type Route = [method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string];

const ROUTES: Record<Role, Route[]> = {
  ADMIN: [
    ['get', '/users'],
    ['post', '/users'],
    ['post', '/session'],
    ['patch', '/session'],
    ['patch', '/session/rooms/1'],
    ['get', '/companies'],
    ['post', '/companies'],
    ['patch', '/companies/1'],
    ['post', '/company-tutors'],
    ['patch', '/company-tutors/1'],
    ['get', '/teachers'],
    ['post', '/teachers'],
    ['patch', '/teachers/1'],
    ['get', '/students'],
    ['post', '/students'],
    ['patch', '/students/1'],
    ['get', '/availability'],
    ['get', '/defenses'],
    ['post', '/defenses/check'],
    ['post', '/defenses'],
    ['patch', '/defenses/1'],
    ['delete', '/defenses/1'],
    ['get', '/company-tutors/schedule'],
  ],
  ENSEIGNANT: [
    ['get', '/me/unavailability'],
    ['put', '/me/unavailability'],
    ['get', '/me/defenses'],
  ],
  ELEVE: [['get', '/me/defense']],
};

const ROLES: Role[] = ['ADMIN', 'ENSEIGNANT', 'ELEVE'];

describe('Who may call what', () => {
  let app: INestApplication;
  const tokens = {} as Record<Role, string>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(prismaMock()).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const jwt = app.get(JwtService);
    for (const role of ROLES) tokens[role] = await jwt.signAsync({ sub: 1, email: `${role}@castelmont.fr`, role });
  });

  afterAll(async () => {
    await app.close();
  });

  for (const owner of ROLES) {
    describe(`the routes of ${owner}`, () => {
      it.each(ROUTES[owner])('%s %s: 401 without a token', async (method, path) => {
        await request(app.getHttpServer())[method](path).expect(401);
      });

      for (const other of ROLES.filter((role) => role !== owner)) {
        it.each(ROUTES[owner])(`%s %s: 403 for ${other}`, async (method, path) => {
          await request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${tokens[other]}`).expect(403);
        });
      }
    });
  }

  it('lets every logged-in role read the session: teachers need its days', async () => {
    for (const role of ROLES) {
      const response = await request(app.getHttpServer()).get('/session').set('Authorization', `Bearer ${tokens[role]}`);
      expect(response.status).not.toBe(403);
    }
  });

  it('leaves /health and /auth/login open', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
  });
});
