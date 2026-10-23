import { Injectable } from '@nestjs/common';
import type { Teacher } from '../generated/prisma/client.js';
import { NotFound } from '../common/errors.js';
import { checkPersonEmail, syncAccountEmail } from '../common/person-email.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TeacherInput, TeacherView } from './teacher.js';

type TeacherRow = Teacher & { _count: { tutoredStudents: number } };

const withCount = { _count: { select: { tutoredStudents: true } } } as const;

/** Teachers: added and edited by the admin, never deleted (cut). */
@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(row: TeacherRow): TeacherView {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      hasAccount: row.userId !== null,
      availabilitySubmittedAt: row.availabilitySubmittedAt?.toISOString(),
      tutoredCount: row._count.tutoredStudents,
    };
  }

  async findAll(): Promise<TeacherView[]> {
    const rows = await this.prisma.teacher.findMany({ include: withCount, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
    return rows.map((row) => this.toView(row));
  }

  async create(input: TeacherInput): Promise<TeacherView> {
    const email = await checkPersonEmail(this.prisma, 'teacher', input.email);
    const row = await this.prisma.teacher.create({ data: { ...input, email }, include: withCount });
    return this.toView(row);
  }

  async update(id: number, patch: Partial<TeacherInput>): Promise<TeacherView> {
    const teacher = await this.prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new NotFound('Teacher', id);

    const data = { ...patch };
    if (patch.email !== undefined) {
      data.email = await checkPersonEmail(this.prisma, 'teacher', patch.email, teacher);
      await syncAccountEmail(this.prisma, teacher.userId, data.email);
    }
    const row = await this.prisma.teacher.update({ where: { id }, data, include: withCount });
    return this.toView(row);
  }
}
