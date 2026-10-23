import { Body, Controller, Get, NotFoundException, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthGuard, type JwtPayload } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { toHttp } from '../common/errors.js';
import { NoTeacherProfile, type MyAvailability, type TeacherAvailability } from './availability.js';
import { AvailabilityService } from './availability.service.js';
import { SaveUnavailabilityDto } from './dto/save-unavailability.dto.js';

function mapErrors(error: unknown): never {
  if (error instanceof NoTeacherProfile) throw new NotFoundException(error.message);
  return toHttp(error);
}

/**
 *   GET /me/unavailability   the logged-in teacher's half-days, and their defenses that fall in them
 *   PUT /me/unavailability   replaces them, and records that the teacher answered
 *   GET /availability        the admin's overview: who has answered, and what
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('me/unavailability')
  @Roles('ENSEIGNANT')
  @ApiForbiddenResponse({ description: 'Requires the ENSEIGNANT role' })
  @ApiNotFoundResponse({ description: 'The account is not linked to a teacher' })
  mine(@CurrentUser() user: JwtPayload): Promise<MyAvailability> {
    return this.availability.mine(user.sub).catch(mapErrors);
  }

  @Put('me/unavailability')
  @Roles('ENSEIGNANT')
  @ApiForbiddenResponse({ description: 'Requires the ENSEIGNANT role' })
  @ApiUnprocessableEntityResponse({ description: 'A day outside the session, or no session yet' })
  saveMine(@CurrentUser() user: JwtPayload, @Body() dto: SaveUnavailabilityDto): Promise<MyAvailability> {
    return this.availability.saveMine(user.sub, dto.halfDays).catch(mapErrors);
  }

  @Get('availability')
  @Roles('ADMIN')
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  overview(): Promise<TeacherAvailability[]> {
    return this.availability.overview();
  }
}
