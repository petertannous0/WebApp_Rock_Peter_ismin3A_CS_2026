import { Injectable } from '@nestjs/common';
import type { Room, Session, Slot } from '../generated/prisma/client.js';
import { fromDay, toDay } from '../common/days.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NoSession,
  RoomNameTaken,
  RoomNotFound,
  SessionAlreadyExists,
  SessionHasDefenses,
  StartDateNotMonday,
  type RoomInput,
  type RoomView,
  type SessionView,
} from './session.js';
import { DAYS_IN_SESSION, dayOfSession, generateSlots, isMonday } from './slots.js';

/**
 * The session: one at a time. Created with its rooms; its 60 slots are
 * generated from the client's rules, never typed.
 *
 * Changing the start date regenerates the slots, so it is refused once a
 * defense is placed. The teachers' unavailability moves with the week: a
 * Thursday afternoon stays a Thursday afternoon.
 */
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private toRoom(row: Room): RoomView {
    return { id: row.id, name: row.name, videoLink: row.videoLink, closedThursdayAfternoon: row.closedThursdayAfternoon };
  }

  private toSession(row: Session & { rooms: Room[]; slots: Slot[] }, defenseCount: number): SessionView {
    return {
      id: row.id,
      name: row.name,
      startDate: toDay(row.startDate),
      days: Array.from({ length: DAYS_IN_SESSION }, (_, i) => toDay(dayOfSession(row.startDate, i))),
      rooms: row.rooms.map((room) => this.toRoom(room)),
      slots: row.slots.map((slot) => ({
        id: slot.id,
        day: toDay(slot.date),
        dayIndex: slot.dayIndex,
        indexInDay: slot.indexInDay,
        startMinutes: slot.startMinutes,
        halfDay: slot.halfDay,
      })),
      defenseCount,
    };
  }

  /** The session, or null when none has been created. */
  async find(): Promise<SessionView | null> {
    const row = await this.prisma.session.findFirst({
      include: {
        rooms: { orderBy: { name: 'asc' } },
        slots: { orderBy: [{ dayIndex: 'asc' }, { indexInDay: 'asc' }] },
      },
      orderBy: { id: 'asc' },
    });
    if (!row) return null;
    const defenseCount = await this.prisma.defense.count({ where: { slot: { sessionId: row.id } } });
    return this.toSession(row, defenseCount);
  }

  async get(): Promise<SessionView> {
    const session = await this.find();
    if (!session) throw new NoSession();
    return session;
  }

  async create(input: { name: string; startDate: string; rooms: RoomInput[] }): Promise<SessionView> {
    if ((await this.prisma.session.count()) > 0) throw new SessionAlreadyExists();
    const monday = fromDay(input.startDate);
    if (!isMonday(monday)) throw new StartDateNotMonday(input.startDate);
    const names = new Set<string>();
    for (const room of input.rooms) {
      if (names.has(room.name)) throw new RoomNameTaken(room.name);
      names.add(room.name);
    }

    await this.prisma.session.create({
      data: {
        name: input.name,
        startDate: monday,
        rooms: { create: input.rooms },
        slots: { create: generateSlots(monday) },
      },
    });
    return this.get();
  }

  async update(patch: { name?: string; startDate?: string }): Promise<SessionView> {
    const session = await this.get();

    if (patch.startDate !== undefined && patch.startDate !== session.startDate) {
      const monday = fromDay(patch.startDate);
      if (!isMonday(monday)) throw new StartDateNotMonday(patch.startDate);
      if (session.defenseCount > 0) throw new SessionHasDefenses(session.defenseCount);

      // A multiple of 7 days: the shifted unavailability never lands on a day of the old week.
      const shift = monday.getTime() - fromDay(session.startDate).getTime();
      const days = session.days.map(fromDay);
      const unavailabilities = await this.prisma.teacherUnavailability.findMany({ where: { date: { in: days } } });

      await this.prisma.$transaction([
        this.prisma.slot.deleteMany({ where: { sessionId: session.id } }),
        this.prisma.slot.createMany({ data: generateSlots(monday).map((slot) => ({ ...slot, sessionId: session.id })) }),
        this.prisma.session.update({ where: { id: session.id }, data: { startDate: monday } }),
        ...unavailabilities.map((u) =>
          this.prisma.teacherUnavailability.update({ where: { id: u.id }, data: { date: new Date(u.date.getTime() + shift) } }),
        ),
      ]);
    }

    if (patch.name !== undefined) {
      await this.prisma.session.update({ where: { id: session.id }, data: { name: patch.name } });
    }
    return this.get();
  }

  /**
   * Closing a room on Thursday afternoon is allowed even when defenses are
   * placed there: the placement grid then shows them in conflict.
   */
  async updateRoom(id: number, patch: Partial<RoomInput>): Promise<RoomView> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new RoomNotFound(id);
    if (patch.name !== undefined && patch.name !== room.name) {
      const taken = await this.prisma.room.findFirst({ where: { sessionId: room.sessionId, name: patch.name } });
      if (taken) throw new RoomNameTaken(patch.name);
    }
    return this.toRoom(await this.prisma.room.update({ where: { id }, data: patch }));
  }
}
