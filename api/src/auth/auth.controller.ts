import { Body, Controller, Get, HttpCode, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard, type JwtPayload } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { AccessTokenDto } from './dto/access-token.dto.js';
import { JwtPayloadDto } from './dto/jwt-payload.dto.js';
import { LoginDto } from './dto/login.dto.js';

/**
 *   POST /auth/login   { email, password }  →  { access_token }, or 401
 *   GET  /auth/whoami  with a Bearer token   →  the token's payload, or 401
 *
 * No sign-up route: accounts are created by the admin, POST /users.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiUnauthorizedResponse({ description: 'Wrong email or password' })
  async login(@Body() dto: LoginDto): Promise<AccessTokenDto> {
    const token = await this.auth.login(dto.email, dto.password);
    if (!token) throw new UnauthorizedException('Wrong email or password');
    return { access_token: token };
  }

  @Get('whoami')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: JwtPayloadDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  whoami(@CurrentUser() user: JwtPayload): JwtPayload {
    return user;
  }
}
