import { NoTeacherProfile } from '../src/availability/availability.js';
import { AvailabilityService } from '../src/availability/availability.service.js';
import { InvalidReference } from '../src/common/errors.js';
import type { SessionService } from '../src/session/session.service.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const durand = { id: 7, firstName: 'Paul', lastName: 'Durand', userId: 3, availabilitySubmittedAt: null };
const days = ['2027-06-21', '2027-06-22', '2027-06-23', '2027-06-24', '2027-06-25'];
const sessionService = { find: async () => ({ days }) } as unknown as SessionService;

const thursdayAfternoon = { day: '2027-06-24', halfDay: 'AFTERNOON' as const };

describe('AvailabilityService', () => {
  let prisma: PrismaMock;
  let service: AvailabilityService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new AvailabilityService(asPrisma(prisma), sessionService);
    prisma.teacher.findUnique.mockResolvedValue(durand);
    prisma.teacherUnavailability.findMany.mockResolvedValue([]);
    prisma.defense.findMany.mockResolvedValue([]);
  });

  describe('saveMine', () => {
    it('replaces the whole list, and records that the teacher answered', async () => {
      await service.saveMine(3, [thursdayAfternoon]);

      expect(prisma.teacherUnavailability.deleteMany).toHaveBeenCalledWith({ where: { teacherId: 7 } });
      expect(prisma.teacherUnavailability.createMany).toHaveBeenCalledWith({
        data: [{ teacherId: 7, date: new Date('2027-06-24T00:00:00.000Z'), halfDay: 'AFTERNOON' }],
      });
      expect(prisma.teacher.update.mock.calls[0][0].data.availabilitySubmittedAt).toBeInstanceOf(Date);
    });

    it('accepts an empty list: available all week is an answer too', async () => {
      await service.saveMine(3, []);

      expect(prisma.teacherUnavailability.createMany).toHaveBeenCalledWith({ data: [] });
      expect(prisma.teacher.update).toHaveBeenCalled();
    });

    it('keeps one copy of a half-day sent twice', async () => {
      await service.saveMine(3, [thursdayAfternoon, thursdayAfternoon]);

      expect(prisma.teacherUnavailability.createMany.mock.calls[0][0].data).toHaveLength(1);
    });

    it('refuses a day outside the session, and saves nothing', async () => {
      await expect(service.saveMine(3, [{ day: '2027-06-26', halfDay: 'MORNING' }])).rejects.toBeInstanceOf(InvalidReference);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuses an account that is not linked to a teacher', async () => {
      prisma.teacher.findUnique.mockResolvedValue(null);

      await expect(service.saveMine(3, [])).rejects.toBeInstanceOf(NoTeacherProfile);
    });
  });

  describe('mine', () => {
    it('warns about a defense that falls in an unavailable half-day, and only that one', async () => {
      prisma.teacherUnavailability.findMany.mockResolvedValue([{ date: new Date('2027-06-24T00:00:00.000Z'), halfDay: 'AFTERNOON' }]);
      const student = { firstName: 'Léa', lastName: 'Martin' };
      prisma.defense.findMany.mockResolvedValue([
        { slot: { date: new Date('2027-06-24T00:00:00.000Z'), halfDay: 'AFTERNOON', startMinutes: 850 }, room: { name: 'Salle B' }, student },
        { slot: { date: new Date('2027-06-24T00:00:00.000Z'), halfDay: 'MORNING', startMinutes: 510 }, room: { name: 'Salle A' }, student },
      ]);

      const mine = await service.mine(3);

      expect(mine.unavailable).toEqual([thursdayAfternoon]);
      expect(mine.defensesInUnavailableHalfDays).toEqual([
        { day: '2027-06-24', halfDay: 'AFTERNOON', startMinutes: 850, studentName: 'Léa Martin', roomName: 'Salle B' },
      ]);
    });

    it('looks for the defenses where they sit in either jury role', async () => {
      await service.mine(3);

      expect(prisma.defense.findMany.mock.calls[0][0].where).toEqual({
        OR: [{ secondTeacherId: 7 }, { student: { academicTutorId: 7 } }],
      });
    });

    it('says the teacher has not answered when they never saved', async () => {
      expect((await service.mine(3)).submittedAt).toBeUndefined();
    });
  });

  describe('overview', () => {
    it('lists every teacher, answered or not', async () => {
      prisma.teacher.findMany.mockResolvedValue([
        { ...durand, email: 'p@c.fr', availabilitySubmittedAt: new Date('2027-05-10T08:00:00.000Z'), unavailabilities: [] },
        { ...durand, id: 8, userId: null, email: 'a@c.fr', unavailabilities: [] },
      ]);

      const overview = await service.overview();

      expect(overview.map((t) => [t.submittedAt, t.hasAccount])).toEqual([
        ['2027-05-10T08:00:00.000Z', true],
        [undefined, false],
      ]);
    });
  });
});
