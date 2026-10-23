import { AlreadyUsed, NotFound } from '../src/common/errors.js';
import { TeachersService } from '../src/teachers/teachers.service.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const durand = {
  id: 7,
  firstName: 'Paul',
  lastName: 'Durand',
  email: 'paul.durand@castelmont.fr',
  userId: 3,
  availabilitySubmittedAt: new Date('2027-05-10T08:00:00.000Z'),
  _count: { tutoredStudents: 3 },
};

describe('TeachersService', () => {
  let prisma: PrismaMock;
  let teachers: TeachersService;

  beforeEach(() => {
    prisma = prismaMock();
    teachers = new TeachersService(asPrisma(prisma));
    prisma.teacher.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
  });

  it('lists the teachers with their account, their answer and how many students they tutor', async () => {
    prisma.teacher.findMany.mockResolvedValue([durand, { ...durand, id: 8, userId: null, availabilitySubmittedAt: null, _count: { tutoredStudents: 0 } }]);

    const list = await teachers.findAll();

    expect(list[0]).toEqual({
      id: 7,
      firstName: 'Paul',
      lastName: 'Durand',
      email: 'paul.durand@castelmont.fr',
      hasAccount: true,
      availabilitySubmittedAt: '2027-05-10T08:00:00.000Z',
      tutoredCount: 3,
    });
    expect(list[1]).toMatchObject({ hasAccount: false, availabilitySubmittedAt: undefined, tutoredCount: 0 });
  });

  it('creates a teacher with a lower-cased email', async () => {
    prisma.teacher.create.mockResolvedValue({ ...durand, userId: null });

    await teachers.create({ firstName: 'Paul', lastName: 'Durand', email: ' Paul.Durand@Castelmont.fr ' });

    expect(prisma.teacher.create.mock.calls[0][0].data.email).toBe('paul.durand@castelmont.fr');
  });

  it('refuses an email already used by another teacher', async () => {
    prisma.teacher.findUnique.mockResolvedValue({ ...durand, id: 99 });

    await expect(teachers.create({ firstName: 'X', lastName: 'Y', email: 'paul.durand@castelmont.fr' })).rejects.toBeInstanceOf(AlreadyUsed);
  });

  it("keeps the teacher's own email on an update, and moves the login of their account with a new one", async () => {
    prisma.teacher.findUnique.mockImplementation(async ({ where }) => (where.id === 7 ? durand : null));
    prisma.teacher.update.mockResolvedValue(durand);

    await teachers.update(7, { email: 'p.durand@castelmont.fr' });

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { email: 'p.durand@castelmont.fr' } });
  });

  it('throws NotFound for an unknown teacher', async () => {
    await expect(teachers.update(404, { firstName: 'X' })).rejects.toBeInstanceOf(NotFound);
  });
});
