import { InvalidReference, NotFound } from '../src/common/errors.js';
import { PlacementRefused } from '../src/defenses/defense.js';
import { DefensesService } from '../src/defenses/defenses.service.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { generateSlots } from '../src/session/slots.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const monday = new Date('2027-06-21T00:00:00.000Z');
const slots = generateSlots(monday).map((slot, i) => ({ ...slot, id: i + 1, sessionId: 1 }));
const rooms = [
  { id: 1, name: 'Salle A', videoLink: 'https://visio.castelmont.fr/salle-a', closedThursdayAfternoon: false, sessionId: 1 },
  { id: 3, name: 'Salle C', videoLink: 'https://visio.castelmont.fr/salle-c', closedThursdayAfternoon: true, sessionId: 1 },
];
const teachers = [
  { id: 1, firstName: 'Paul', lastName: 'Durand' },
  { id: 3, firstName: 'Tom', lastName: 'Blanc' },
];
const company = { id: 1, name: 'Provence Microsystèmes' };
const jean = { id: 10, firstName: 'Jean', lastName: 'Roux', email: 'jean.roux@provence.fr' };
const lea = { id: 20, firstName: 'Léa', lastName: 'Martin', companyId: 1, company, companyTutorId: 10, academicTutorId: 1 };

const proposal = { studentId: 20, secondTeacherId: 3, slotId: 2, roomId: 1 };
const THURSDAY_13_30 = 3 * 12 + 6 + 1;

function defenseRow(id: number, fields = proposal) {
  const slot = slots.find((s) => s.id === fields.slotId)!;
  return {
    id,
    ...fields,
    slot,
    room: rooms.find((r) => r.id === fields.roomId)!,
    secondTeacher: teachers.find((t) => t.id === fields.secondTeacherId)!,
    student: { ...lea, companyTutor: jean, academicTutor: teachers[0] },
  };
}

describe('DefensesService', () => {
  let prisma: PrismaMock;
  let service: DefensesService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new DefensesService(asPrisma(prisma));
    prisma.session.findFirst.mockResolvedValue({ id: 1 });
    prisma.slot.findMany.mockResolvedValue(slots);
    prisma.room.findMany.mockResolvedValue(rooms);
    prisma.teacher.findMany.mockResolvedValue(teachers);
    prisma.companyTutor.findMany.mockResolvedValue([jean]);
    prisma.student.findMany.mockResolvedValue([lea]);
    prisma.teacherUnavailability.findMany.mockResolvedValue([]);
    prisma.defense.findMany.mockResolvedValue([]);
    prisma.defense.create.mockResolvedValue({ id: 50 });
    prisma.defense.update.mockResolvedValue({ id: 50 });
    prisma.defense.findUnique.mockResolvedValue(defenseRow(50));
  });

  describe('check (the dry run)', () => {
    it('answers canSave with no violation for a valid placement, and saves nothing', async () => {
      await expect(service.check(proposal)).resolves.toEqual({ violations: [], canSave: true, needsForce: false, hint: undefined });
      expect(prisma.defense.create).not.toHaveBeenCalled();
    });

    it('gives each violation its severity and its French sentence', async () => {
      const result = await service.check({ ...proposal, slotId: THURSDAY_13_30, roomId: 3 });

      expect(result).toEqual({
        violations: [{ rule: 'ROOM_CLOSED', severity: 'BLOCKING', message: 'Salle C est fermée le jeudi après-midi (jeudi 24 juin).' }],
        canSave: false,
        needsForce: false,
        hint: undefined,
      });
    });

    it('marks warnings only as "save anyway"', async () => {
      prisma.teacherUnavailability.findMany.mockResolvedValue([{ teacherId: 1, date: monday, halfDay: 'MORNING' }]);

      const result = await service.check(proposal);

      expect(result).toMatchObject({ canSave: true, needsForce: true, violations: [{ rule: 'TEACHER_UNAVAILABLE', severity: 'WARNING' }] });
    });

    it('refuses an unknown student or a slot of no session with InvalidReference, not a rule', async () => {
      await expect(service.check({ ...proposal, studentId: 999 })).rejects.toBeInstanceOf(InvalidReference);
      await expect(service.check({ ...proposal, slotId: 999 })).rejects.toBeInstanceOf(InvalidReference);
    });

    it('refuses everything while there is no session', async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(service.check(proposal)).rejects.toBeInstanceOf(InvalidReference);
    });
  });

  describe('create', () => {
    it('saves a valid placement', async () => {
      const created = await service.create(proposal);

      expect(prisma.defense.create).toHaveBeenCalledWith({ data: proposal });
      expect(created).toMatchObject({ id: 50, roomName: 'Salle A', student: { name: 'Léa Martin' }, secondTeacher: { name: 'Tom Blanc' } });
    });

    it('refuses a blocking violation, even with force, and saves nothing', async () => {
      const refusal = await service.create({ ...proposal, secondTeacherId: 1 }, true).catch((e: unknown) => e);

      expect(refusal).toBeInstanceOf(PlacementRefused);
      expect((refusal as PlacementRefused).result.violations.map((v) => v.rule)).toEqual(['SECOND_TEACHER_IS_ACADEMIC_TUTOR']);
      expect(prisma.defense.create).not.toHaveBeenCalled();
    });

    it('refuses warnings without force, then saves them with force', async () => {
      prisma.teacherUnavailability.findMany.mockResolvedValue([{ teacherId: 3, date: monday, halfDay: 'MORNING' }]);

      const refusal = await service.create(proposal).catch((e: unknown) => e);
      expect(refusal).toBeInstanceOf(PlacementRefused);
      expect((refusal as PlacementRefused).result.needsForce).toBe(true);
      expect(prisma.defense.create).not.toHaveBeenCalled();

      await service.create(proposal, true);
      expect(prisma.defense.create).toHaveBeenCalled();
    });

    it('turns a unique-constraint clash (two saves at once) into a refusal, checked again', async () => {
      prisma.defense.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }));

      await expect(service.create(proposal)).rejects.toBeInstanceOf(PlacementRefused);
    });
  });

  describe('move', () => {
    it('checks the new place with the defense left out, then updates it', async () => {
      // Léa's own defense is at 9:10 room A; moving her to 8:30 must not clash with herself.
      prisma.defense.findMany.mockResolvedValue([{ id: 50, ...proposal }]);

      await service.move(50, { slotId: 1 });

      expect(prisma.defense.update).toHaveBeenCalledWith({ where: { id: 50 }, data: { secondTeacherId: 3, slotId: 1, roomId: 1 } });
    });

    it('applies the same rules: no move into a closed room', async () => {
      prisma.defense.findMany.mockResolvedValue([{ id: 50, ...proposal }]);

      await expect(service.move(50, { slotId: THURSDAY_13_30, roomId: 3 })).rejects.toBeInstanceOf(PlacementRefused);
      expect(prisma.defense.update).not.toHaveBeenCalled();
    });

    it('throws NotFound for an unknown defense', async () => {
      prisma.defense.findUnique.mockResolvedValue(null);

      await expect(service.move(404, { slotId: 1 })).rejects.toBeInstanceOf(NotFound);
    });
  });

  describe('remove', () => {
    it('deletes an existing defense, and NotFound otherwise', async () => {
      await service.remove(50);
      expect(prisma.defense.delete).toHaveBeenCalledWith({ where: { id: 50 } });

      prisma.defense.findUnique.mockResolvedValue(null);
      await expect(service.remove(404)).rejects.toBeInstanceOf(NotFound);
    });
  });

  describe('findAll', () => {
    it('gives each defense its whole jury, the room link, and its current conflicts', async () => {
      // Léa was placed; since then Blanc said he is unavailable on Monday morning.
      prisma.defense.findMany.mockImplementation(async (args?: { include?: unknown }) =>
        args?.include ? [defenseRow(50)] : [{ id: 50, ...proposal }],
      );
      prisma.teacherUnavailability.findMany.mockResolvedValue([{ teacherId: 3, date: monday, halfDay: 'MORNING' }]);

      const [defense] = await service.findAll();

      expect(defense).toMatchObject({
        day: '2027-06-21',
        startMinutes: 550,
        videoLink: 'https://visio.castelmont.fr/salle-a',
        academicTutor: { name: 'Paul Durand' },
        secondTeacher: { name: 'Tom Blanc' },
        companyTutor: { name: 'Jean Roux', email: 'jean.roux@provence.fr' },
      });
      expect(defense.violations).toEqual([
        { rule: 'TEACHER_UNAVAILABLE', severity: 'WARNING', message: 'Tom Blanc a indiqué être indisponible le lundi 21 juin matin.' },
      ]);
    });
  });
});
