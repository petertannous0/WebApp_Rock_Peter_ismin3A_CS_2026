import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { toHttp } from '../common/errors.js';
import { PersonDto, PersonPatchDto } from '../common/person.dto.js';
import type { TeacherView } from './teacher.js';
import { TeachersService } from './teachers.service.js';

@Controller('teachers')
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  @ApiOkResponse({ description: 'Every teacher, by last name' })
  findAll(): Promise<TeacherView[]> {
    return this.teachers.findAll();
  }

  @Post()
  @ApiConflictResponse({ description: 'Email already used' })
  create(@Body() dto: PersonDto): Promise<TeacherView> {
    return this.teachers.create(dto).catch(toHttp);
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Unknown teacher' })
  @ApiConflictResponse({ description: 'Email already used' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: PersonPatchDto): Promise<TeacherView> {
    return this.teachers.update(id, dto).catch(toHttp);
  }
}
