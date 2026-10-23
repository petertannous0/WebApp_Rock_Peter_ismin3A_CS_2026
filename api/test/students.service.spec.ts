import { AlreadyUsed, InvalidReference, NotFound } from '../src/common/errors.js';
import { StudentsService } from '../src/students/students.service.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const company = { id: 1, name: 'Provence Microsystèmes' };
const tutor = { id: 5, firstName: 'Jean', lastName: 'Roux', email: 'jean.roux@provence.fr', companyId: 1 };
const teacher = { id: 7, firstName: 'Paul', lastName: 'Durand', email: 'paul.durand@castelmont.fr', userId: null };
const input = {
  firstName: 'Léa',
  lastName: 'Martin',
  email: 'Lea.Martin@etu.castelmont.fr',
  companyId: 1,
  companyTutorId: 5,
  academicTutorId: 7,
};
const row = { id: 12, ...input, email: 'lea.martin@etu.castelmont.fr', userId: null, company, companyTutor: tutor, academicTutor: teacher, defense: null };

describe('StudentsService', () => {
  let prisma: PrismaMock;
  let students: StudentsService;

  beforeEach(() => {
    prisma = prismaMock();
    students = new StudentsService(asPrisma(prisma));
    prisma.company.findUnique.mockResolvedValue(company);
    prisma.companyTutor.findUnique.mockResolvedValue(tutor);
    prisma.teacher.findUnique.mockResolvedValue(teacher);
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.student.create.mockResolvedValue(row);
    prisma.student.update.mockResolvedValue(row);
  });

  it('creates a student with a lower-cased email, and shows their jury people by name', async () => {
    const student = await students.create(input);

    expect(prisma.student.create.mock.calls[0][0].data.email).toBe('lea.martin@etu.castelmont.fr');
    expect(student).toMatchObject({
      company: { name: 'Provence Microsystèmes' },
      companyTutor: { name: 'Jean Roux', email: 'jean.roux@provence.fr' },
      academicTutor: { name: 'Paul Durand' },
      placed: false,
    });
  });

  it('refuses a company tutor who works for another company', async () => {
    prisma.companyTutor.findUnique.mockResolvedValue({ ...tutor, companyId: 2 });

    await expect(students.create(input)).rejects.toBeInstanceOf(InvalidReference);
    expect(prisma.student.create).not.toHaveBeenCalled();
  });

  it.each([
    ['company', () => prisma.company.findUnique.mockResolvedValue(null)],
    ['company tutor', () => prisma.companyTutor.findUnique.mockResolvedValue(null)],
    ['academic tutor', () => prisma.teacher.findUnique.mockResolvedValue(null)],
  ])('refuses an unknown %s', async (_what, makeUnknown) => {
    makeUnknown();

    await expect(students.create(input)).rejects.toBeInstanceOf(InvalidReference);
  });

  it("refuses an email used by another student, or by another person's account", async () => {
    prisma.student.findUnique.mockResolvedValueOnce({ id: 99, email: 'lea.martin@etu.castelmont.fr' });
    await expect(students.create(input)).rejects.toBeInstanceOf(AlreadyUsed);

    prisma.user.findUnique.mockResolvedValueOnce({ id: 3, email: 'lea.martin@etu.castelmont.fr' });
    await expect(students.create(input)).rejects.toBeInstanceOf(AlreadyUsed);
  });

  it('throws NotFound when updating an unknown student', async () => {
    await expect(students.update(404, { firstName: 'X' })).rejects.toBeInstanceOf(NotFound);
  });

  it('checks the new company tutor against the current company on update', async () => {
    prisma.student.findUnique.mockResolvedValue({ ...row, companyId: 1 });
    prisma.companyTutor.findUnique.mockResolvedValue({ ...tutor, id: 6, companyId: 2 });

    await expect(students.update(12, { companyTutorId: 6 })).rejects.toBeInstanceOf(InvalidReference);
  });

  it("moves the login of the student's account with their new email", async () => {
    prisma.student.findUnique.mockImplementation(async ({ where }) => (where.id === 12 ? { ...row, userId: 4 } : null));

    await students.update(12, { email: 'lea.m@etu.castelmont.fr' });

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 4 }, data: { email: 'lea.m@etu.castelmont.fr' } });
  });
});
