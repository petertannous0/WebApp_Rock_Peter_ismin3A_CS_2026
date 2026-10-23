import { JwtService } from '@nestjs/jwt';
import { AuthService, normalizeEmail } from '../src/auth/auth.service.js';
import { hashPassword } from '../src/auth/password.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const jwt = new JwtService({ secret: 'test-secret' });
const nadia = { id: 1, email: 'admin@castelmont.fr', passwordHash: hashPassword('soutenance2027'), role: 'ADMIN' };

describe('AuthService', () => {
  let prisma: PrismaMock;
  let auth: AuthService;

  beforeEach(() => {
    prisma = prismaMock();
    auth = new AuthService(asPrisma(prisma), jwt);
  });

  it('returns a token carrying the id, the email and the role', async () => {
    prisma.user.findUnique.mockResolvedValue(nadia);

    const token = await auth.login('admin@castelmont.fr', 'soutenance2027');

    expect(await jwt.verifyAsync(token!)).toMatchObject({ sub: 1, email: 'admin@castelmont.fr', role: 'ADMIN' });
  });

  it('looks the email up lower-cased and trimmed', async () => {
    prisma.user.findUnique.mockResolvedValue(nadia);

    await auth.login('  Admin@Castelmont.FR ', 'soutenance2027');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'admin@castelmont.fr' } });
  });

  it('returns null for a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(nadia);

    await expect(auth.login('admin@castelmont.fr', 'wrong')).resolves.toBeNull();
  });

  it('returns null for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(auth.login('nobody@castelmont.fr', 'soutenance2027')).resolves.toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('lower-cases and trims', () => {
    expect(normalizeEmail(' Lea.Martin@Castelmont.fr ')).toBe('lea.martin@castelmont.fr');
  });
});
