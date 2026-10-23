import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { StudentView } from './student.js';
import { StudentsService } from './students.service.js';

@Controller('students')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOkResponse({ description: 'Every student, by last name' })
  findAll(): Promise<StudentView[]> {
    return this.students.findAll();
  }
}
