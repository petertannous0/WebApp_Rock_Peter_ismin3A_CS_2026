import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { toHttp } from '../common/errors.js';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto.js';
import type { StudentView } from './student.js';
import { StudentsService } from './students.service.js';

/** Students: the admin's business only. */
@Controller('students')
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @ApiOkResponse({ description: 'Every student, by last name' })
  findAll(): Promise<StudentView[]> {
    return this.students.findAll();
  }

  @Post()
  @ApiConflictResponse({ description: 'Email already used' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown company, tutor or teacher; tutor of another company' })
  create(@Body() dto: CreateStudentDto): Promise<StudentView> {
    return this.students.create(dto).catch(toHttp);
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Unknown student' })
  @ApiConflictResponse({ description: 'Email already used' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown company, tutor or teacher; tutor of another company' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto): Promise<StudentView> {
    return this.students.update(id, dto).catch(toHttp);
  }
}
