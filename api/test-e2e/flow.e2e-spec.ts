import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

/**
 * The three features, end to end, on the seeded database: what the mocked
 * tests cannot see (real queries, relation ordering, nested creates, unique
 * constraints). One story, in order: each step builds on the previous one.
 */

const PASSWORD = 'soutenance2027';
const DEMO = { ADMIN: 'admin@castelmont.fr', ENSEIGNANT: 'margaux.mercier@castelmont.fr', ELEVE: 'clara.muller@etu.castelmont.fr' };

interface Slot {
  id: number;
  dayIndex: number;
  indexInDay: number;
  day: string;
  halfDay: string;
}

describe('Soutenances, end to end on SQLite', () => {
  let app: INestApplication;
  const token: Record<string, string> = {};
  let session: { days: string[]; rooms: { id: number; name: string }[]; slots: Slot[] };

  const api = () => request(app.getHttpServer());
  const as = (role: keyof typeof DEMO) => ({ Authorization: `Bearer ${token[role]}` });
  const slot = (dayIndex: number, indexInDay: number) => session.slots.find((s) => s.dayIndex === dayIndex && s.indexInDay === indexInDay)!;
  const room = (name: string) => session.rooms.find((r) => r.name === name)!;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in the three demo accounts, one per role', async () => {
    for (const [role, email] of Object.entries(DEMO)) {
      const response = await api().post('/auth/login').send({ email, password: PASSWORD }).expect(200);
      token[role] = response.body.access_token;
      const whoami = await api().get('/auth/whoami').set('Authorization', `Bearer ${token[role]}`).expect(200);
      expect(whoami.body.role).toBe(role);
    }
  });

  it('F1: the seeded session has 5 days, 4 rooms, 60 slots', async () => {
    const response = await api().get('/session').set(as('ENSEIGNANT')).expect(200);
    session = response.body;

    expect(session.days).toEqual(['2027-06-21', '2027-06-22', '2027-06-23', '2027-06-24', '2027-06-25']);
    expect(session.rooms.map((r) => r.name)).toEqual(['Salle A', 'Salle B', 'Salle C', 'Salle D']);
    expect(session.slots).toHaveLength(60);
  });

  it('F1: the admin creates a teacher account, and the teacher logs in', async () => {
    const teachers = (await api().get('/teachers').set(as('ADMIN')).expect(200)).body as { id: number; email: string; hasAccount: boolean }[];
    const without = teachers.find((t) => !t.hasAccount)!;

    await api().post('/users').set(as('ADMIN')).send({ role: 'ENSEIGNANT', personId: without.id, password: 'motdepasse1' }).expect(201);
    await api().post('/users').set(as('ADMIN')).send({ role: 'ENSEIGNANT', personId: without.id, password: 'motdepasse1' }).expect(409);
    await api().post('/auth/login').send({ email: without.email, password: 'motdepasse1' }).expect(200);
  });

  it('F1: a student cannot get a company tutor of another company', async () => {
    const companies = (await api().get('/companies').set(as('ADMIN')).expect(200)).body as { id: number; tutors: { id: number }[] }[];
    const teachers = (await api().get('/teachers').set(as('ADMIN')).expect(200)).body as { id: number }[];

    await api()
      .post('/students')
      .set(as('ADMIN'))
      .send({ firstName: 'Test', lastName: 'E2E', email: 'test.e2e@etu.castelmont.fr', companyId: companies[0].id, companyTutorId: companies[1].tutors[0].id, academicTutorId: teachers[0].id })
      .expect(422);
  });

  it('F2: the 10 seeded defenses respect every rule', async () => {
    const defenses = (await api().get('/defenses').set(as('ADMIN')).expect(200)).body as { violations: unknown[] }[];

    expect(defenses).toHaveLength(10);
    expect(defenses.filter((d) => d.violations.length > 0)).toEqual([]);
  });

  let placedId: number;
  let placedStudentId: number;

  it('F2: places a student on Friday at 16:50, after a clean dry run', async () => {
    const students = (await api().get('/students').set(as('ADMIN')).expect(200)).body as { id: number; placed: boolean }[];
    const teachers = (await api().get('/teachers').set(as('ADMIN')).expect(200)).body as { id: number }[];
    const student = students.find((s) => !s.placed)!;
    const where = { studentId: student.id, slotId: slot(4, 11).id, roomId: room('Salle B').id };

    let secondTeacherId = 0;
    for (const teacher of teachers) {
      const check = await api().post('/defenses/check').set(as('ADMIN')).send({ ...where, secondTeacherId: teacher.id }).expect(200);
      if (check.body.violations.length === 0) {
        secondTeacherId = teacher.id;
        break;
      }
    }
    expect(secondTeacherId).toBeGreaterThan(0);

    const created = await api().post('/defenses').set(as('ADMIN')).send({ ...where, secondTeacherId }).expect(201);
    placedId = created.body.id;
    placedStudentId = student.id;
    expect(created.body).toMatchObject({ day: '2027-06-25', startMinutes: 1010, roomName: 'Salle B', violations: [] });
  });

  it('F2: refuses the same student twice, with the reason in French', async () => {
    const response = await api()
      .post('/defenses')
      .set(as('ADMIN'))
      .send({ studentId: placedStudentId, secondTeacherId: 1, slotId: slot(0, 11).id, roomId: room('Salle D').id, force: true })
      .expect(409);

    expect(response.body.violations.map((v: { rule: string }) => v.rule)).toContain('STUDENT_ALREADY_PLACED');
    expect(response.body.violations.find((v: { rule: string }) => v.rule === 'STUDENT_ALREADY_PLACED').message).toMatch(/a déjà une soutenance le vendredi 25 juin à 16 h 50, Salle B\.$/);
  });

  it('F2: refuses a move into a room closed on Thursday afternoon, accepts a move to Thursday morning', async () => {
    const closed = await api().patch(`/defenses/${placedId}`).set(as('ADMIN')).send({ slotId: slot(3, 6).id, roomId: room('Salle C').id }).expect(409);
    expect(closed.body.violations.map((v: { rule: string }) => v.rule)).toContain('ROOM_CLOSED');

    // Thursday 11:50 in room C: the morning, the room is open. The dry run of the move says so.
    const current = (await api().get('/defenses').set(as('ADMIN')).expect(200)).body.find((d: { id: number }) => d.id === placedId);
    const thursdayMorning = { slotId: slot(3, 5).id, roomId: room('Salle C').id };
    const check = await api()
      .post('/defenses/check')
      .set(as('ADMIN'))
      .send({ studentId: placedStudentId, secondTeacherId: current.secondTeacher.id, ...thursdayMorning, defenseId: placedId })
      .expect(200);
    expect(check.body.violations).toEqual([]);

    const moved = await api().patch(`/defenses/${placedId}`).set(as('ADMIN')).send(thursdayMorning).expect(200);
    expect(moved.body).toMatchObject({ day: '2027-06-24', startMinutes: 710, roomName: 'Salle C', violations: [] });
  });

  it('F2: the start date of the session cannot change once defenses are placed', async () => {
    await api().patch('/session').set(as('ADMIN')).send({ startDate: '2027-06-28' }).expect(409);
  });

  it('F1 + F2: a teacher marks unavailable the half-day of their own defense; they are warned, the grid shows it', async () => {
    // Margaux Mercier sits on Clara Muller's jury, Monday 8:30.
    const saved = await api()
      .put('/me/unavailability')
      .set(as('ENSEIGNANT'))
      .send({ halfDays: [{ day: '2027-06-21', halfDay: 'MORNING' }] })
      .expect(200);
    expect(saved.body.defensesInUnavailableHalfDays).toMatchObject([{ studentName: 'Clara Muller', startMinutes: 510 }]);

    const defenses = (await api().get('/defenses').set(as('ADMIN')).expect(200)).body as { student: { name: string }; violations: { rule: string; severity: string }[] }[];
    const clara = defenses.find((d) => d.student.name === 'Clara Muller')!;
    expect(clara.violations).toMatchObject([{ rule: 'TEACHER_UNAVAILABLE', severity: 'WARNING' }]);

    const overview = (await api().get('/availability').set(as('ADMIN')).expect(200)).body as { email: string; unavailable: unknown[]; submittedAt?: string }[];
    expect(overview.find((t) => t.email === DEMO.ENSEIGNANT)).toMatchObject({ unavailable: [{ day: '2027-06-21', halfDay: 'MORNING' }] });
  });

  it('F3: each role sees its own schedule', async () => {
    const teacher = await api().get('/me/defenses').set(as('ENSEIGNANT')).expect(200);
    expect(teacher.body).toMatchObject([{ day: '2027-06-21', startMinutes: 510, role: 'ACADEMIC_TUTOR', student: { name: 'Clara Muller' } }]);

    const student = await api().get('/me/defense').set(as('ELEVE')).expect(200);
    expect(student.body).toMatchObject({ studentName: 'Clara Muller', defense: { roomName: 'Salle A', jury: { academicTutor: 'Margaux Mercier' } } });

    const tutors = (await api().get('/company-tutors/schedule').set(as('ADMIN')).expect(200)).body as { defenses: unknown[] }[];
    expect(tutors.filter((t) => t.defenses.length > 0).length).toBeGreaterThanOrEqual(10);
  });

  it('F2: deletes the defense placed by this test', async () => {
    await api().delete(`/defenses/${placedId}`).set(as('ADMIN')).expect(204);
    await api().delete(`/defenses/${placedId}`).set(as('ADMIN')).expect(404);
  });
});
