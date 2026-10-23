import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
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
import { CreateSessionDto, UpdateRoomDto, UpdateSessionDto } from './dto/session.dto.js';
import {
  NoSession,
  RoomNameTaken,
  RoomNotFound,
  SessionAlreadyExists,
  SessionHasDefenses,
  StartDateNotMonday,
  type RoomView,
  type SessionView,
} from './session.js';
import { SessionService } from './session.service.js';

/** Maps the domain errors of the session to HTTP answers. */
function toHttp(error: unknown): never {
  if (error instanceof NoSession || error instanceof RoomNotFound) throw new NotFoundException(error.message);
  if (error instanceof SessionAlreadyExists || error instanceof SessionHasDefenses || error instanceof RoomNameTaken) {
    throw new ConflictException(error.message);
  }
  if (error instanceof StartDateNotMonday) throw new UnprocessableEntityException(error.message);
  throw error;
}

/**
 * Reading the session is for every logged-in user: a teacher needs its days
 * to enter their unavailability. Writing it is for the admin.
 */
@Controller('session')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
export class SessionController {
  constructor(private readonly session: SessionService) {}

  @Get()
  @ApiNotFoundResponse({ description: 'No session yet' })
  get(): Promise<SessionView> {
    return this.session.get().catch(toHttp);
  }

  @Post()
  @Roles('ADMIN')
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  @ApiConflictResponse({ description: 'A session already exists' })
  @ApiUnprocessableEntityResponse({ description: 'The start date is not a Monday' })
  create(@Body() dto: CreateSessionDto): Promise<SessionView> {
    return this.session.create(dto).catch(toHttp);
  }

  @Patch()
  @Roles('ADMIN')
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  @ApiConflictResponse({ description: 'Defenses are placed: the start date cannot change' })
  update(@Body() dto: UpdateSessionDto): Promise<SessionView> {
    return this.session.update(dto).catch(toHttp);
  }

  @Patch('rooms/:id')
  @Roles('ADMIN')
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  @ApiNotFoundResponse({ description: 'Unknown room' })
  updateRoom(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto): Promise<RoomView> {
    return this.session.updateRoom(id, dto).catch(toHttp);
  }
}
