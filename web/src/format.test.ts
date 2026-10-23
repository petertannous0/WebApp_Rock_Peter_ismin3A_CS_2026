import { describe, expect, it } from 'vitest';
import { formatDay, formatHalfDay, formatShortDay, formatTime } from './format';

describe('format', () => {
  it('writes a day of the session in French', () => {
    expect(formatDay('2027-06-24')).toBe('jeudi 24 juin');
  });

  it('writes a short day', () => {
    expect(formatShortDay('2027-06-21')).toBe('lun. 21');
  });

  it('writes a time the way the client does', () => {
    expect(formatTime(510)).toBe('8 h 30');
    expect(formatTime(550)).toBe('9 h 10');
    expect(formatTime(810)).toBe('13 h 30');
  });

  it('writes a half-day', () => {
    expect(formatHalfDay('2027-06-24', 'AFTERNOON')).toBe('jeudi 24 juin, après-midi');
  });
});
