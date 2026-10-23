import { Injectable } from '@nestjs/common';
import type { TeacherUnavailability } from '../generated/prisma/client.js';
import { fromDay, toDay } from '../common/days.js';
import { InvalidReference } from '../common/errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionService } from '../session/session.service.js';
import {
  NoTeacherProfile,
  type HalfDaySlot,
  type MyAvailability,
  type TeacherAvailability,
} from './availability.js';

const byDayThenHalfDay = [{ date: 'asc' }, { halfDay: 'desc' }] as const; // MORNING before AFTERNOON

const toHalfDay = (row: TeacherUnavailability): HalfDaySlot => ({ day: toDay(row.date), halfDay: row.halfDay });

/**
 * The teachers' unavailability, by half-day. A teacher replaces their whole
 * list at once, and saving (even an empty list) records that they answered.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
  ) {}

  private async teacherOf(userId: number) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new NoTeacherProfile(userId);
    return teacher;
  }

  async mine(userId: number): Promise<MyAvailability> {
    const teacher = await this.teacherOf(userId);
    const rows = await this.prisma.teacherUnavailability.findMany({ where: { teacherId: teacher.id }, orderBy: [...byDayThenHalfDay] });
    const unavailable = rows.map(toHalfDay);
    const isUnavailable = new Set(unavailable.map((h) => `${h.day}|${h.halfDay}`));

    // The defenses where they sit on the jury, either role.
    const defenses = await this.prisma.defense.findMany({
      where: { OR: [{ secondTeacherId: teacher.id }, { student: { academicTutorId: teacher.id } }] },
      include: { slot: true, room: true, student: true },
    });
    const defensesInUnavailableHalfDays = defenses
      .filter((d) => isUnavailable.has(`${toDay(d.slot.date)}|${d.slot.halfDay}`))
      .sort((a, b) => a.slot.date.getTime() - b.slot.date.getTime() || a.slot.startMinutes - b.slot.startMinutes)
      .map((d) => ({
        day: toDay(d.slot.date),
        halfDay: d.slot.halfDay,
        startMinutes: d.slot.startMinutes,
        studentName: `${d.student.firstName} ${d.student.lastName}`,
        roomName: d.room.name,
      }));

    return { submittedAt: teacher.availabilitySubmittedAt?.toISOString(), unavailable, defensesInUnavailableHalfDays };
  }

  async saveMine(userId: number, halfDays: HalfDaySlot[]): Promise<MyAvailability> {
    const teacher = await this.teacherOf(userId);
    const session = await this.session.find();
    if (!session) throw new InvalidReference('No session yet: nothing to be unavailable for');

    const unique = new Map(halfDays.map((h) => [`${h.day}|${h.halfDay}`, h]));
    for (const h of unique.values()) {
      if (!session.days.includes(h.day)) throw new InvalidReference(`${h.day} is not a day of the session`);
    }

    await this.prisma.$transaction([
      this.prisma.teacherUnavailability.deleteMany({ where: { teacherId: teacher.id } }),
      this.prisma.teacherUnavailability.createMany({
        data: [...unique.values()].map((h) => ({ teacherId: teacher.id, date: fromDay(h.day), halfDay: h.halfDay })),
      }),
      this.prisma.teacher.update({ where: { id: teacher.id }, data: { availabilitySubmittedAt: new Date() } }),
    ]);
    return this.mine(userId);
  }

  /** Every teacher, answered or not: who to chase. */
  async overview(): Promise<TeacherAvailability[]> {
    const rows = await this.prisma.teacher.findMany({
      include: { unavailabilities: { orderBy: [...byDayThenHalfDay] } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      hasAccount: row.userId !== null,
      submittedAt: row.availabilitySubmittedAt?.toISOString(),
      unavailable: row.unavailabilities.map(toHalfDay),
    }));
  }
}
