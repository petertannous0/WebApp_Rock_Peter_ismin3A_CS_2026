import {
  NoSession,
  RoomNameTaken,
  RoomNotFound,
  SessionAlreadyExists,
  SessionHasDefenses,
  StartDateNotMonday,
} from '../src/session/session.js';
import { SessionService } from '../src/session/session.service.js';
import { generateSlots } from '../src/session/slots.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const monday = new Date('2027-06-21T00:00:00.000Z');
const rooms = [
  { name: 'Salle A', videoLink: 'https://visio.castelmont.fr/salle-a', closedThursdayAfternoon: false },
  { name: 'Salle C', videoLink: 'https://visio.castelmont.fr/salle-c', closedThursdayAfternoon: true },
];

/** The session row the fake database holds, with ids on rooms and slots. */
function sessionRow(start = monday) {
  return {
    id: 1,
    name: 'Soutenances 3A, juin 2027',
    startDate: start,
    rooms: rooms.map((room, i) => ({ ...room, id: i + 1, sessionId: 1 })),
    slots: generateSlots(start).map((slot, i) => ({ ...slot, id: i + 1, sessionId: 1 })),
  };
}

describe('SessionService', () => {
  let prisma: PrismaMock;
  let service: SessionService;

  beforeEach(() => {
    prisma = prismaMock();
    service = new SessionService(asPrisma(prisma));
    prisma.defense.count.mockResolvedValue(0);
  });

  describe('get', () => {
    it('gives the five days, the rooms and the 60 slots, days as YYYY-MM-DD', async () => {
      prisma.session.findFirst.mockResolvedValue(sessionRow());

      const session = await service.get();

      expect(session.days).toEqual(['2027-06-21', '2027-06-22', '2027-06-23', '2027-06-24', '2027-06-25']);
      expect(session.slots).toHaveLength(60);
      expect(session.slots[0]).toMatchObject({ day: '2027-06-21', startMinutes: 510, halfDay: 'MORNING' });
      expect(session.rooms[1]).toMatchObject({ name: 'Salle C', closedThursdayAfternoon: true });
    });

    it('throws NoSession when there is none', async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(service.get()).rejects.toBeInstanceOf(NoSession);
    });
  });

  describe('create', () => {
    it('creates the session with its rooms and its 60 generated slots', async () => {
      prisma.session.count.mockResolvedValue(0);
      prisma.session.findFirst.mockResolvedValue(sessionRow());

      await service.create({ name: 'Soutenances 3A, juin 2027', startDate: '2027-06-21', rooms });

      const { data } = prisma.session.create.mock.calls[0][0];
      expect(data.startDate).toEqual(monday);
      expect(data.rooms.create).toEqual(rooms);
      expect(data.slots.create).toHaveLength(60);
    });

    it('refuses a second session', async () => {
      prisma.session.count.mockResolvedValue(1);

      await expect(service.create({ name: 'x', startDate: '2027-06-21', rooms })).rejects.toBeInstanceOf(SessionAlreadyExists);
    });

    it('refuses a start date that is not a Monday', async () => {
      prisma.session.count.mockResolvedValue(0);

      await expect(service.create({ name: 'x', startDate: '2027-06-22', rooms })).rejects.toBeInstanceOf(StartDateNotMonday);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('refuses two rooms with the same name', async () => {
      prisma.session.count.mockResolvedValue(0);

      await expect(service.create({ name: 'x', startDate: '2027-06-21', rooms: [rooms[0], rooms[0]] })).rejects.toBeInstanceOf(
        RoomNameTaken,
      );
    });
  });

  describe('update', () => {
    it('refuses to move the week once a defense is placed', async () => {
      prisma.session.findFirst.mockResolvedValue(sessionRow());
      prisma.defense.count.mockResolvedValue(3);

      await expect(service.update({ startDate: '2027-06-28' })).rejects.toBeInstanceOf(SessionHasDefenses);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('moves the week: new slots, and the unavailability shifted to the same weekday', async () => {
      prisma.session.findFirst.mockResolvedValue(sessionRow());
      prisma.teacherUnavailability.findMany.mockResolvedValue([
        { id: 9, teacherId: 4, date: new Date('2027-06-24T00:00:00.000Z'), halfDay: 'AFTERNOON' },
      ]);

      await service.update({ startDate: '2027-06-28' });

      expect(prisma.slot.deleteMany).toHaveBeenCalledWith({ where: { sessionId: 1 } });
      expect(prisma.slot.createMany.mock.calls[0][0].data[0].date).toEqual(new Date('2027-06-28T00:00:00.000Z'));
      // Thursday 24 June → Thursday 1 July
      expect(prisma.teacherUnavailability.update).toHaveBeenCalledWith({
        where: { id: 9 },
        data: { date: new Date('2027-07-01T00:00:00.000Z') },
      });
    });

    it('refuses to move the week to a day that is not a Monday', async () => {
      prisma.session.findFirst.mockResolvedValue(sessionRow());

      await expect(service.update({ startDate: '2027-06-30' })).rejects.toBeInstanceOf(StartDateNotMonday);
    });

    it('renames without touching the slots', async () => {
      prisma.session.findFirst.mockResolvedValue(sessionRow());

      await service.update({ name: 'Juin 2027' });

      expect(prisma.session.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Juin 2027' } });
      expect(prisma.slot.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('updateRoom', () => {
    it('closes a room on Thursday afternoon', async () => {
      prisma.room.findUnique.mockResolvedValue({ id: 2, sessionId: 1, ...rooms[0] });
      prisma.room.update.mockResolvedValue({ id: 2, sessionId: 1, ...rooms[0], closedThursdayAfternoon: true });

      const room = await service.updateRoom(2, { closedThursdayAfternoon: true });

      expect(room.closedThursdayAfternoon).toBe(true);
    });

    it('throws RoomNotFound for an unknown room', async () => {
      prisma.room.findUnique.mockResolvedValue(null);

      await expect(service.updateRoom(99, { name: 'Salle Z' })).rejects.toBeInstanceOf(RoomNotFound);
    });

    it('refuses the name of another room', async () => {
      prisma.room.findUnique.mockResolvedValue({ id: 2, sessionId: 1, ...rooms[0] });
      prisma.room.findFirst.mockResolvedValue({ id: 3, name: 'Salle C' });

      await expect(service.updateRoom(2, { name: 'Salle C' })).rejects.toBeInstanceOf(RoomNameTaken);
    });
  });
});
