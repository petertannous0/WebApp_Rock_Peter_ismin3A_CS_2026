import { Injectable } from '@nestjs/common';
import type { Student } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { StudentView } from './student.js';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(row: Student): StudentView {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      hasAccount: row.userId !== null,
    };
  }

  async findAll(): Promise<StudentView[]> {
    const rows = await this.prisma.student.findMany({ orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
    return rows.map((row) => this.toView(row));
  }
}
