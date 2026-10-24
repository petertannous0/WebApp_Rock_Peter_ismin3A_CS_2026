import { Body, ConflictException, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { toHttp } from '../common/errors.js';
import { PlacementRefused, type CheckResult, type DefenseView } from './defense.js';
import { DefensesService } from './defenses.service.js';
import { CheckDefenseDto, CreateDefenseDto, MoveDefenseDto } from './dto/defense.dto.js';

function mapErrors(error: unknown): never {
  if (error instanceof PlacementRefused) {
    throw new ConflictException({ statusCode: 409, message: error.message, ...error.result });
  }
  return toHttp(error);
}

@Controller('defenses')
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
export class DefensesController {
  constructor(private readonly defenses: DefensesService) {}

  @Get()
  findAll(): Promise<DefenseView[]> {
    return this.defenses.findAll().catch(mapErrors);
  }

  @Post('check')
  @HttpCode(200)
  @ApiOkResponse({ description: 'The violations of this placement, and whether it can be saved' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown student, teacher, slot or room' })
  check(@Body() dto: CheckDefenseDto): Promise<CheckResult> {
    return this.defenses.check(dto).catch(mapErrors);
  }

  @Post()
  @ApiConflictResponse({ description: 'Refused: a blocking violation, or warnings without force. The body lists them.' })
  @ApiUnprocessableEntityResponse({ description: 'Unknown student, teacher, slot or room' })
  create(@Body() dto: CreateDefenseDto): Promise<DefenseView> {
    const { force, ...proposal } = dto;
    return this.defenses.create(proposal, force).catch(mapErrors);
  }

  @Patch(':id')
  @ApiNotFoundResponse({ description: 'Unknown defense' })
  @ApiConflictResponse({ description: 'Refused: a blocking violation, or warnings without force. The body lists them.' })
  move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveDefenseDto): Promise<DefenseView> {
    const { force, ...patch } = dto;
    return this.defenses.move(id, patch, force).catch(mapErrors);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Removed' })
  @ApiNotFoundResponse({ description: 'Unknown defense' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.defenses.remove(id).catch(mapErrors);
  }
}
