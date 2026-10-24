import { Injectable } from '@nestjs/common';
import type { Student, Teacher, User } from '../generated/prisma/client.js';
import { hashPassword } from '../auth/password.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailAlreadyUsed, PersonAlreadyHasAccount, PersonNotFound, type Account, type AccountRole } from './user.js';

type UserWithPeople = User & { teacher: Teacher | null; student: Student | null };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toAccount(row: UserWithPeople): Account {
    const person = row.teacher ?? row.student;
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      name: person ? `${person.firstName} ${person.lastName}` : undefined,
      teacherId: row.teacher?.id,
      studentId: row.student?.id,
    };
  }

  async findAll(): Promise<Account[]> {
    const rows = await this.prisma.user.findMany({
      include: { teacher: true, student: true },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
    return rows.map((row) => this.toAccount(row));
  }

  async create(input: { role: AccountRole; personId: number; password: string }): Promise<Account> {
    const person =
      input.role === 'ENSEIGNANT'
        ? await this.prisma.teacher.findUnique({ where: { id: input.personId } })
        : await this.prisma.student.findUnique({ where: { id: input.personId } });
    if (!person) throw new PersonNotFound(input.role, input.personId);
    if (person.userId !== null) throw new PersonAlreadyHasAccount(person.email);

    const email = person.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new EmailAlreadyUsed(email);

    const link = { connect: { id: person.id } };
    const row = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(input.password),
        role: input.role,
        ...(input.role === 'ENSEIGNANT' ? { teacher: link } : { student: link }),
      },
      include: { teacher: true, student: true },
    });
    return this.toAccount(row);
  }
}
