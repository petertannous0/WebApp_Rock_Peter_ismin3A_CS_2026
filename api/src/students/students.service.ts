import { Injectable } from '@nestjs/common';
import type { Company, CompanyTutor, Defense, Student, Teacher } from '../generated/prisma/client.js';
import { InvalidReference, NotFound } from '../common/errors.js';
import { checkPersonEmail, syncAccountEmail } from '../common/person-email.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StudentInput, StudentView } from './student.js';

type StudentRow = Student & { company: Company; companyTutor: CompanyTutor; academicTutor: Teacher; defense: Defense | null };

const relations = { company: true, companyTutor: true, academicTutor: true, defense: true } as const;

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

/**
 * Students: added and edited by the admin, never deleted (cut). A student
 * always has a company, a tutor of that company, and an academic tutor.
 *
 * Editing a placed student (new academic tutor, new company) is allowed: the
 * placement grid then shows their defense in conflict, if it is.
 */
@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(row: StudentRow): StudentView {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      hasAccount: row.userId !== null,
      company: { id: row.company.id, name: row.company.name },
      companyTutor: { id: row.companyTutor.id, name: fullName(row.companyTutor), email: row.companyTutor.email },
      academicTutor: { id: row.academicTutor.id, name: fullName(row.academicTutor) },
      placed: row.defense !== null,
    };
  }

  private async checkReferences(input: Pick<StudentInput, 'companyId' | 'companyTutorId' | 'academicTutorId'>): Promise<void> {
    if (!(await this.prisma.company.findUnique({ where: { id: input.companyId } }))) {
      throw new InvalidReference(`Company ${input.companyId} does not exist`);
    }
    const tutor = await this.prisma.companyTutor.findUnique({ where: { id: input.companyTutorId } });
    if (!tutor) throw new InvalidReference(`Company tutor ${input.companyTutorId} does not exist`);
    if (tutor.companyId !== input.companyId) {
      throw new InvalidReference(`Company tutor ${input.companyTutorId} does not work for company ${input.companyId}`);
    }
    if (!(await this.prisma.teacher.findUnique({ where: { id: input.academicTutorId } }))) {
      throw new InvalidReference(`Teacher ${input.academicTutorId} does not exist`);
    }
  }

  async findAll(): Promise<StudentView[]> {
    const rows = await this.prisma.student.findMany({ include: relations, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
    return rows.map((row) => this.toView(row));
  }

  async create(input: StudentInput): Promise<StudentView> {
    await this.checkReferences(input);
    const email = await checkPersonEmail(this.prisma, 'student', input.email);
    const row = await this.prisma.student.create({ data: { ...input, email }, include: relations });
    return this.toView(row);
  }

  async update(id: number, patch: Partial<StudentInput>): Promise<StudentView> {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFound('Student', id);

    await this.checkReferences({
      companyId: patch.companyId ?? student.companyId,
      companyTutorId: patch.companyTutorId ?? student.companyTutorId,
      academicTutorId: patch.academicTutorId ?? student.academicTutorId,
    });
    const data = { ...patch };
    if (patch.email !== undefined) {
      data.email = await checkPersonEmail(this.prisma, 'student', patch.email, student);
      await syncAccountEmail(this.prisma, student.userId, data.email);
    }
    const row = await this.prisma.student.update({ where: { id }, data, include: relations });
    return this.toView(row);
  }
}
