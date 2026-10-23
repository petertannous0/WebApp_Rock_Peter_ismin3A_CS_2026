import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './roles.guard.js';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not set: cp .env.example .env');

/**
 * Signs and verifies tokens with JWT_SECRET (compose gives a default).
 *
 * `global: true` makes JwtService injectable everywhere, so `AuthGuard` works
 * in any module without importing anything.
 */
@Module({
  imports: [JwtModule.register({ global: true, secret, signOptions: { expiresIn: '8h' } })],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard],
})
export class AuthModule {}
