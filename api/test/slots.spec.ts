import { dayOfSession, generateSlots, isMonday } from '../src/session/slots.js';

/** Monday 21 June 2027, the seeded session. */
const monday = new Date(Date.UTC(2027, 5, 21));

const hhmm = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

describe('generateSlots', () => {
  const slots = generateSlots(monday);

  it('makes 12 slots a day, 5 days: 60', () => {
    expect(slots).toHaveLength(60);
    for (let day = 0; day < 5; day++) {
      expect(slots.filter((slot) => slot.dayIndex === day)).toHaveLength(12);
    }
  });

  it('starts the morning slots at 8:30, back to back every 40 minutes', () => {
    const morning = slots.filter((slot) => slot.dayIndex === 0 && slot.halfDay === 'MORNING');
    expect(morning.map((slot) => hhmm(slot.startMinutes))).toEqual(['8:30', '9:10', '9:50', '10:30', '11:10', '11:50']);
  });

  it('starts the afternoon slots at 13:30, after the lunch break', () => {
    const afternoon = slots.filter((slot) => slot.dayIndex === 0 && slot.halfDay === 'AFTERNOON');
    expect(afternoon.map((slot) => hhmm(slot.startMinutes))).toEqual(['13:30', '14:10', '14:50', '15:30', '16:10', '16:50']);
  });

  it('ends the last morning slot at 12:30 and the last afternoon slot at 17:30', () => {
    const day = slots.filter((slot) => slot.dayIndex === 0);
    expect(hhmm(day[5].startMinutes + 40)).toBe('12:30');
    expect(hhmm(day[11].startMinutes + 40)).toBe('17:30');
  });

  it('numbers the slots 0 to 11 inside each day', () => {
    const friday = slots.filter((slot) => slot.dayIndex === 4);
    expect(friday.map((slot) => slot.indexInDay)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('dates the days Monday 21 to Friday 25 June, at midnight UTC', () => {
    const days = [...new Set(slots.map((slot) => slot.date.toISOString()))];
    expect(days).toEqual([
      '2027-06-21T00:00:00.000Z',
      '2027-06-22T00:00:00.000Z',
      '2027-06-23T00:00:00.000Z',
      '2027-06-24T00:00:00.000Z',
      '2027-06-25T00:00:00.000Z',
    ]);
  });
});

describe('isMonday and dayOfSession', () => {
  it('recognises a Monday, and only a Monday', () => {
    expect(isMonday(monday)).toBe(true);
    expect(isMonday(new Date(Date.UTC(2027, 5, 22)))).toBe(false);
  });

  it('gives Thursday as day 3, at midnight even from a Monday with a time', () => {
    expect(dayOfSession(new Date(Date.UTC(2027, 5, 21, 15, 45)), 3).toISOString()).toBe('2027-06-24T00:00:00.000Z');
  });
});
