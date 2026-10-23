import { Body, ConflictException, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AccountDto } from './dto/account.dto.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { EmailAlreadyUsed, PersonAlreadyHasAccount, PersonNotFound, type Account } from './user.js';
import { UsersService } from './users.service.js';

/** Accounts: the admin's business only. */
@Controller('users')
@Roles('ADMIN')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: [AccountDto] })
  findAll(): Promise<Account[]> {
    return this.users.findAll();
  }

  @Post()
  @ApiCreatedResponse({ type: AccountDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'Unknown teacher or student' })
  @ApiConflictResponse({ description: 'The person already has an account, or the email is taken' })
  async create(@Body() dto: CreateAccountDto): Promise<Account> {
    try {
      return await this.users.create(dto);
    } catch (error) {
      if (error instanceof PersonNotFound) throw new NotFoundException(error.message);
      if (error instanceof PersonAlreadyHasAccount || error instanceof EmailAlreadyUsed) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
