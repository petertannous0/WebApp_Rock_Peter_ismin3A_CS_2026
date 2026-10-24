import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { generateSlots } from '../src/session/slots.js';
import { prismaMock, type PrismaMock } from './prisma-mock.js';

describe('/defenses over HTTP', () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let admin: string;
  let teacher: string;

  const proposal = { studentId: 20, secondTeacherId: 3, slotId: 2, roomId: 1 };

  beforeAll(async () => {
    prisma = prismaMock();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(prisma).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const jwt = app.get(JwtService);
    admin = await jwt.signAsync({ sub: 1, email: 'admin@castelmont.fr', role: 'ADMIN' });
    teacher = await jwt.signAsync({ sub: 2, email: 'p@castelmont.fr', role: 'ENSEIGNANT' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    const monday = new Date('2027-06-21T00:00:00.000Z');
    prisma.session.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.findMany.mockResolvedValue(generateSlots(monday).map((slot, i) => ({ ...slot, id: i + 1 })));
    prisma.room.findMany.mockResolvedValue([{ id: 1, name: 'Salle A', closedThursdayAfternoon: false }]);
    prisma.teacher.findMany.mockResolvedValue([
      { id: 1, firstName: 'Paul', lastName: 'Durand' },
      { id: 3, firstName: 'Tom', lastName: 'Blanc' },
    ]);
    prisma.companyTutor.findMany.mockResolvedValue([{ id: 10, firstName: 'Jean', lastName: 'Roux' }]);
    prisma.student.findMany.mockResolvedValue([
      { id: 20, firstName: 'Léa', lastName: 'Martin', companyId: 1, company: { name: 'Provence' }, companyTutorId: 10, academicTutorId: 1 },
    ]);
    prisma.teacherUnavailability.findMany.mockResolvedValue([]);
    prisma.defense.findMany.mockResolvedValue([]);
  });

  it('answers the dry run with 200 and the violations', async () => {
    const response = await request(app.getHttpServer())
      .post('/defenses/check')
      .set('Authorization', `Bearer ${admin}`)
      .send({ ...proposal, secondTeacherId: 1 })
      .expect(200);

    expect(response.body).toMatchObject({ canSave: false, violations: [{ rule: 'SECOND_TEACHER_IS_ACADEMIC_TUTOR', severity: 'BLOCKING' }] });
  });

  it('refuses a blocking placement with 409, the list of violations in the body', async () => {
    const response = await request(app.getHttpServer())
      .post('/defenses')
      .set('Authorization', `Bearer ${admin}`)
      .send({ ...proposal, secondTeacherId: 1, force: true })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      canSave: false,
      violations: [{ message: 'Paul Durand est déjà le tuteur académique de Léa Martin : choisissez un autre second enseignant.' }],
    });
  });

  it('answers 422 for a slot that does not exist', async () => {
    await request(app.getHttpServer()).post('/defenses/check').set('Authorization', `Bearer ${admin}`).send({ ...proposal, slotId: 999 }).expect(422);
  });

  it('answers 400 for an id that is not a number', async () => {
    await request(app.getHttpServer()).post('/defenses/check').set('Authorization', `Bearer ${admin}`).send({ ...proposal, slotId: 'nine' }).expect(400);
  });

  it('is for the admin only', async () => {
    await request(app.getHttpServer()).get('/defenses').set('Authorization', `Bearer ${teacher}`).expect(403);
    await request(app.getHttpServer()).post('/defenses').set('Authorization', `Bearer ${teacher}`).send(proposal).expect(403);
    await request(app.getHttpServer()).get('/defenses').expect(401);
  });

  it('gives each role its own schedule route, and only that one (F3)', async () => {
    const student = await app.get(JwtService).signAsync({ sub: 3, email: 'l@etu.castelmont.fr', role: 'ELEVE' });
    const server = app.getHttpServer();

    await request(server).get('/me/defenses').set('Authorization', `Bearer ${student}`).expect(403);
    await request(server).get('/me/defense').set('Authorization', `Bearer ${teacher}`).expect(403);
    await request(server).get('/company-tutors/schedule').set('Authorization', `Bearer ${teacher}`).expect(403);
    await request(server).get('/company-tutors/schedule').set('Authorization', `Bearer ${student}`).expect(403);

    prisma.companyTutor.findMany.mockResolvedValue([]);
    await request(server).get('/company-tutors/schedule').set('Authorization', `Bearer ${admin}`).expect(200);
  });
});
