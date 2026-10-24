import { NoProfile } from '../src/schedule/schedule.js';
import { ScheduleService } from '../src/schedule/schedule.service.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const durand = { id: 1, firstName: 'Paul', lastName: 'Durand', email: 'paul.durand@castelmont.fr' };
const blanc = { id: 3, firstName: 'Tom', lastName: 'Blanc', email: 'tom.blanc@castelmont.fr' };
const jean = { id: 10, firstName: 'Jean', lastName: 'Roux', email: 'jean.roux@provence.fr' };
const company = { id: 1, name: 'Provence Microsystèmes' };
const roomA = { id: 1, name: 'Salle A', videoLink: 'https://visio.castelmont.fr/salle-a' };

function row(id: number, student: { id: number; firstName: string; lastName: string; academicTutorId: number }, secondTeacher: typeof durand, slot: { dayIndex: number; startMinutes: number }) {
  return {
    id,
    studentId: student.id,
    secondTeacherId: secondTeacher.id,
    slot: { date: new Date(Date.UTC(2027, 5, 21 + slot.dayIndex)), startMinutes: slot.startMinutes, halfDay: 'MORNING', dayIndex: slot.dayIndex },
    room: roomA,
    secondTeacher,
    student: { ...student, company, companyTutorId: jean.id, companyTutor: jean, academicTutor: student.academicTutorId === 1 ? durand : blanc },
  };
}

const lea = { id: 20, firstName: 'Léa', lastName: 'Martin', academicTutorId: 1 };
const zoe = { id: 22, firstName: 'Zoé', lastName: 'Blanc', academicTutorId: 3 };

describe('ScheduleService', () => {
  let prisma: PrismaMock;
  let service: ScheduleService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new ScheduleService(asPrisma(prisma));
  });

  describe('forTeacher', () => {
    it("gives each defense the teacher's role in it, and the whole jury", async () => {
      prisma.teacher.findUnique.mockResolvedValue({ ...durand, userId: 5 });
      prisma.defense.findMany.mockResolvedValue([
        row(1, lea, blanc, { dayIndex: 0, startMinutes: 510 }),
        row(2, zoe, durand, { dayIndex: 2, startMinutes: 550 }),
      ]);

      const defenses = await service.forTeacher(5);

      expect(defenses.map((d) => [d.day, d.role, d.student.name])).toEqual([
        ['2027-06-21', 'ACADEMIC_TUTOR', 'Léa Martin'],
        ['2027-06-23', 'SECOND_TEACHER', 'Zoé Blanc'],
      ]);
      expect(defenses[0]).toMatchObject({
        startMinutes: 510,
        roomName: 'Salle A',
        videoLink: 'https://visio.castelmont.fr/salle-a',
        jury: { academicTutor: 'Paul Durand', secondTeacher: 'Tom Blanc', companyTutor: 'Jean Roux' },
      });
    });

    it('looks in both jury roles, in time order', async () => {
      prisma.teacher.findUnique.mockResolvedValue({ ...durand, userId: 5 });
      prisma.defense.findMany.mockResolvedValue([]);

      await service.forTeacher(5);

      const args = prisma.defense.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ OR: [{ secondTeacherId: 1 }, { student: { academicTutorId: 1 } }] });
      expect(args.orderBy).toEqual([{ slot: { dayIndex: 'asc' } }, { slot: { indexInDay: 'asc' } }]);
    });

    it('throws NoProfile for an account without a teacher', async () => {
      prisma.teacher.findUnique.mockResolvedValue(null);

      await expect(service.forTeacher(5)).rejects.toBeInstanceOf(NoProfile);
    });
  });

  describe('forStudent', () => {
    it('gives the slot, the room, the link and the jury, names only', async () => {
      prisma.student.findUnique.mockResolvedValue({ ...lea, userId: 6 });
      prisma.defense.findUnique.mockResolvedValue(row(1, lea, blanc, { dayIndex: 0, startMinutes: 510 }));

      const schedule = await service.forStudent(6);

      expect(schedule).toEqual({
        studentName: 'Léa Martin',
        defense: {
          day: '2027-06-21',
          startMinutes: 510,
          halfDay: 'MORNING',
          roomName: 'Salle A',
          videoLink: 'https://visio.castelmont.fr/salle-a',
          jury: { academicTutor: 'Paul Durand', secondTeacher: 'Tom Blanc', companyTutor: 'Jean Roux' },
        },
      });
      expect(JSON.stringify(schedule)).not.toContain('@');
    });

    it('answers null while the defense is not placed', async () => {
      prisma.student.findUnique.mockResolvedValue({ ...lea, userId: 6 });
      prisma.defense.findUnique.mockResolvedValue(null);

      await expect(service.forStudent(6)).resolves.toEqual({ studentName: 'Léa Martin', defense: null });
    });

    it('throws NoProfile for an account without a student', async () => {
      prisma.student.findUnique.mockResolvedValue(null);

      await expect(service.forStudent(6)).rejects.toBeInstanceOf(NoProfile);
    });
  });

  describe('forCompanyTutors', () => {
    it("gives every tutor their own defenses, with the room's link, and an empty list for the others", async () => {
      const ines = { id: 11, firstName: 'Inès', lastName: 'Faure', email: 'ines.faure@azur.fr', company: { name: 'Azur Data' } };
      prisma.companyTutor.findMany.mockResolvedValue([{ ...jean, company }, ines]);
      prisma.defense.findMany.mockResolvedValue([row(1, lea, blanc, { dayIndex: 0, startMinutes: 510 }), row(2, zoe, durand, { dayIndex: 1, startMinutes: 810 })]);

      const tutors = await service.forCompanyTutors();

      expect(tutors[0]).toMatchObject({ name: 'Jean Roux', email: 'jean.roux@provence.fr', companyName: 'Provence Microsystèmes' });
      expect(tutors[0].defenses).toEqual([
        { day: '2027-06-21', startMinutes: 510, halfDay: 'MORNING', roomName: 'Salle A', videoLink: 'https://visio.castelmont.fr/salle-a', studentName: 'Léa Martin' },
        { day: '2027-06-22', startMinutes: 810, halfDay: 'MORNING', roomName: 'Salle A', videoLink: 'https://visio.castelmont.fr/salle-a', studentName: 'Zoé Blanc' },
      ]);
      expect(tutors[1]).toMatchObject({ name: 'Inès Faure', defenses: [] });
    });
  });
});
