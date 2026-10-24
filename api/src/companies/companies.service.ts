import { Injectable } from '@nestjs/common';
import type { Company, CompanyTutor } from '../generated/prisma/client.js';
import { normalizeEmail } from '../auth/auth.service.js';
import { AlreadyUsed, InvalidReference, NotFound } from '../common/errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CompanyTutorView, CompanyView } from './company.js';

type TutorInput = { firstName: string; lastName: string; email: string; companyId: number };

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  private toTutor(row: CompanyTutor & { company: Company }): CompanyTutorView {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      companyId: row.companyId,
      companyName: row.company.name,
    };
  }

  async findAll(): Promise<CompanyView[]> {
    const rows = await this.prisma.company.findMany({
      include: {
        tutors: { include: { company: true }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      studentCount: row._count.students,
      tutors: row.tutors.map((tutor) => this.toTutor(tutor)),
    }));
  }

  async create(name: string): Promise<CompanyView> {
    if (await this.prisma.company.findUnique({ where: { name } })) throw new AlreadyUsed('Company name', name);
    const row = await this.prisma.company.create({ data: { name } });
    return { id: row.id, name: row.name, studentCount: 0, tutors: [] };
  }

  async rename(id: number, name: string): Promise<CompanyView> {
    if (!(await this.prisma.company.findUnique({ where: { id } }))) throw new NotFound('Company', id);
    const taken = await this.prisma.company.findUnique({ where: { name } });
    if (taken && taken.id !== id) throw new AlreadyUsed('Company name', name);
    await this.prisma.company.update({ where: { id }, data: { name } });
    return (await this.findAll()).find((company) => company.id === id)!;
  }

  async createTutor(input: TutorInput): Promise<CompanyTutorView> {
    const email = normalizeEmail(input.email);
    if (!(await this.prisma.company.findUnique({ where: { id: input.companyId } }))) {
      throw new InvalidReference(`Company ${input.companyId} does not exist`);
    }
    if (await this.prisma.companyTutor.findUnique({ where: { email } })) throw new AlreadyUsed('Email', email);
    const row = await this.prisma.companyTutor.create({ data: { ...input, email }, include: { company: true } });
    return this.toTutor(row);
  }

  async updateTutor(id: number, patch: Partial<TutorInput>): Promise<CompanyTutorView> {
    const tutor = await this.prisma.companyTutor.findUnique({ where: { id }, include: { _count: { select: { students: true } } } });
    if (!tutor) throw new NotFound('Company tutor', id);

    const data = { ...patch, ...(patch.email !== undefined ? { email: normalizeEmail(patch.email) } : {}) };
    if (data.email !== undefined && data.email !== tutor.email) {
      if (await this.prisma.companyTutor.findUnique({ where: { email: data.email } })) throw new AlreadyUsed('Email', data.email);
    }
    if (data.companyId !== undefined && data.companyId !== tutor.companyId) {
      if (!(await this.prisma.company.findUnique({ where: { id: data.companyId } }))) {
        throw new InvalidReference(`Company ${data.companyId} does not exist`);
      }
      if (tutor._count.students > 0) {
        throw new InvalidReference('This tutor still follows students of their company: change their tutor first');
      }
    }
    const row = await this.prisma.companyTutor.update({ where: { id }, data, include: { company: true } });
    return this.toTutor(row);
  }
}
