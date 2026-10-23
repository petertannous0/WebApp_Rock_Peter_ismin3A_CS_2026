import { Injectable } from '@nestjs/common';
import type { Teacher } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { TeacherView } from './teacher.js';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(row: Teacher): TeacherView {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      hasAccount: row.userId !== null,
    };
  }

  async findAll(): Promise<TeacherView[]> {
    const rows = await this.prisma.teacher.findMany({ orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
    return rows.map((row) => this.toView(row));
  }
}
