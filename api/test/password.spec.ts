import { hashPassword, verifyPassword } from '../src/auth/password.js';

describe('password', () => {
  it('verifies the password that was hashed', () => {
    expect(verifyPassword('soutenance2027', hashPassword('soutenance2027'))).toBe(true);
  });

  it('refuses another password', () => {
    expect(verifyPassword('wrong', hashPassword('soutenance2027'))).toBe(false);
  });

  it('salts: the same password gives two different hashes', () => {
    expect(hashPassword('same')).not.toBe(hashPassword('same'));
  });

  it('refuses a stored value that is not salt:hash', () => {
    expect(verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});
