import { verifyPassword } from '../src/auth/password.js';
import { EmailAlreadyUsed, PersonAlreadyHasAccount, PersonNotFound } from '../src/users/user.js';
import { UsersService } from '../src/users/users.service.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const durand = { id: 7, firstName: 'Paul', lastName: 'Durand', email: 'Paul.Durand@castelmont.fr', userId: null };
const lea = { id: 12, firstName: 'Léa', lastName: 'Martin', email: 'lea.martin@etu.castelmont.fr', userId: null };

describe('UsersService.create', () => {
  let prisma: PrismaMock;
  let users: UsersService;

  beforeEach(() => {
    prisma = prismaMock();
    users = new UsersService(asPrisma(prisma));
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 3,
      email: data.email,
      role: data.role,
      passwordHash: data.passwordHash,
      teacher: data.teacher ? durand : null,
      student: data.student ? lea : null,
    }));
  });

  it("creates a teacher's account with their email, lower-cased, linked to the teacher", async () => {
    prisma.teacher.findUnique.mockResolvedValue(durand);

    const account = await users.create({ role: 'ENSEIGNANT', personId: 7, password: 'soutenance2027' });

    expect(account).toEqual({ id: 3, email: 'paul.durand@castelmont.fr', role: 'ENSEIGNANT', name: 'Paul Durand', teacherId: 7, studentId: undefined });
    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.teacher).toEqual({ connect: { id: 7 } });
    expect(data.student).toBeUndefined();
  });

  it("creates a student's account, linked to the student", async () => {
    prisma.student.findUnique.mockResolvedValue(lea);

    const account = await users.create({ role: 'ELEVE', personId: 12, password: 'soutenance2027' });

    expect(account).toMatchObject({ role: 'ELEVE', name: 'Léa Martin', studentId: 12 });
    expect(prisma.teacher.findUnique).not.toHaveBeenCalled();
  });

  it('stores a hash of the password, never the password itself', async () => {
    prisma.teacher.findUnique.mockResolvedValue(durand);

    await users.create({ role: 'ENSEIGNANT', personId: 7, password: 'soutenance2027' });

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.passwordHash).not.toContain('soutenance2027');
    expect(verifyPassword('soutenance2027', data.passwordHash)).toBe(true);
  });

  it('refuses an unknown person', async () => {
    prisma.teacher.findUnique.mockResolvedValue(null);

    await expect(users.create({ role: 'ENSEIGNANT', personId: 99, password: 'soutenance2027' })).rejects.toBeInstanceOf(PersonNotFound);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuses a person who already has an account', async () => {
    prisma.student.findUnique.mockResolvedValue({ ...lea, userId: 4 });

    await expect(users.create({ role: 'ELEVE', personId: 12, password: 'soutenance2027' })).rejects.toBeInstanceOf(PersonAlreadyHasAccount);
  });

  it('refuses an email that another account already uses', async () => {
    prisma.teacher.findUnique.mockResolvedValue(durand);
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'paul.durand@castelmont.fr' });

    await expect(users.create({ role: 'ENSEIGNANT', personId: 7, password: 'soutenance2027' })).rejects.toBeInstanceOf(EmailAlreadyUsed);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('UsersService.findAll', () => {
  it('never exposes the password hash, and names the person', async () => {
    const prisma = prismaMock();
    prisma.user.findMany.mockResolvedValue([
      { id: 1, email: 'admin@castelmont.fr', role: 'ADMIN', passwordHash: 'x:y', teacher: null, student: null },
      { id: 2, email: 'lea.martin@etu.castelmont.fr', role: 'ELEVE', passwordHash: 'x:y', teacher: null, student: lea },
    ]);

    const accounts = await new UsersService(asPrisma(prisma)).findAll();

    expect(accounts[0]).toEqual({ id: 1, email: 'admin@castelmont.fr', role: 'ADMIN', name: undefined, teacherId: undefined, studentId: undefined });
    expect(accounts[1]).toMatchObject({ name: 'Léa Martin', studentId: 12 });
    expect(JSON.stringify(accounts)).not.toContain('passwordHash');
  });
});
