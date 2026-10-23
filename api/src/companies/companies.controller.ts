import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { toHttp } from '../common/errors.js';
import { CompaniesService } from './companies.service.js';
import type { CompanyTutorView, CompanyView } from './company.js';
import { CompanyDto, CreateCompanyTutorDto, UpdateCompanyTutorDto } from './dto/company.dto.js';

/** Companies and company tutors: the admin's business only. */
@Controller()
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('companies')
  findAll(): Promise<CompanyView[]> {
    return this.companies.findAll();
  }

  @Post('companies')
  @ApiConflictResponse({ description: 'Name already used' })
  create(@Body() dto: CompanyDto): Promise<CompanyView> {
    return this.companies.create(dto.name).catch(toHttp);
  }

  @Patch('companies/:id')
  @ApiNotFoundResponse({ description: 'Unknown company' })
  @ApiConflictResponse({ description: 'Name already used' })
  rename(@Param('id', ParseIntPipe) id: number, @Body() dto: CompanyDto): Promise<CompanyView> {
    return this.companies.rename(id, dto.name).catch(toHttp);
  }

  @Post('company-tutors')
  @ApiConflictResponse({ description: 'Email already used' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown company' })
  createTutor(@Body() dto: CreateCompanyTutorDto): Promise<CompanyTutorView> {
    return this.companies.createTutor(dto).catch(toHttp);
  }

  @Patch('company-tutors/:id')
  @ApiNotFoundResponse({ description: 'Unknown tutor' })
  @ApiConflictResponse({ description: 'Email already used' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown company, or the tutor still follows students' })
  updateTutor(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyTutorDto): Promise<CompanyTutorView> {
    return this.companies.updateTutor(id, dto).catch(toHttp);
  }
}
