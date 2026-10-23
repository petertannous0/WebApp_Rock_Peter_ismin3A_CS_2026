import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { toDay } from '../common/days.js';
import { InvalidReference, NotFound } from '../common/errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  canBeSaved,
  checkPlacement,
  companyTutorOtherDays,
  SEVERITY,
  type PlacementState,
  type ProposedDefense,
  type Violation,
} from './conflicts.js';
import { PlacementRefused, type CheckResult, type DefenseView, type ViolationView } from './defense.js';
import { describeCompanyTutorDays, describeViolation } from './messages.js';

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

function toViolationView(violation: Violation): ViolationView {
  return { rule: violation.rule, severity: SEVERITY[violation.rule], message: describeViolation(violation) };
}

/**
 * The placement of the defenses. The rules live in `conflicts.ts`, a pure
 * function: this service only loads the state, calls it, and saves.
 *
 * Every save checks every rule first. A blocking violation refuses it; warnings
 * only refuse it without `force` (decision P5-a). The unique constraints of
 * the table (one defense per student, per room and slot) stay the last guard
 * against two saves at the same instant.
 */
@Injectable()
export class DefensesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Everything the checker needs, for the session. One read per table. */
  async loadState(): Promise<PlacementState> {
    const session = await this.prisma.session.findFirst({ orderBy: { id: 'asc' } });
    if (!session) throw new InvalidReference('No session yet: create it first');

    const [slots, rooms, teachers, companyTutors, students, unavailabilities, defenses] = await Promise.all([
      this.prisma.slot.findMany({ where: { sessionId: session.id } }),
      this.prisma.room.findMany({ where: { sessionId: session.id } }),
      this.prisma.teacher.findMany(),
      this.prisma.companyTutor.findMany(),
      this.prisma.student.findMany({ include: { company: true } }),
      this.prisma.teacherUnavailability.findMany(),
      this.prisma.defense.findMany({ where: { slot: { sessionId: session.id } } }),
    ]);

    return {
      slots: slots.map((s) => ({ id: s.id, day: toDay(s.date), dayIndex: s.dayIndex, startMinutes: s.startMinutes, halfDay: s.halfDay })),
      rooms: rooms.map((r) => ({ id: r.id, name: r.name, closedThursdayAfternoon: r.closedThursdayAfternoon })),
      teachers: teachers.map((t) => ({ id: t.id, name: fullName(t) })),
      companyTutors: companyTutors.map((t) => ({ id: t.id, name: fullName(t) })),
      students: students.map((s) => ({
        id: s.id,
        name: fullName(s),
        companyId: s.companyId,
        companyName: s.company.name,
        companyTutorId: s.companyTutorId,
        academicTutorId: s.academicTutorId,
      })),
      unavailabilities: unavailabilities.map((u) => ({ teacherId: u.teacherId, day: toDay(u.date), halfDay: u.halfDay })),
      defenses: defenses.map((d) => ({ id: d.id, studentId: d.studentId, secondTeacherId: d.secondTeacherId, slotId: d.slotId, roomId: d.roomId })),
    };
  }

  /** The ids of the proposal exist in this session: otherwise a 422, never a rule. */
  private checkIds(proposal: ProposedDefense, state: PlacementState): void {
    const exists = (list: { id: number }[], id: number) => list.some((item) => item.id === id);
    if (!exists(state.students, proposal.studentId)) throw new InvalidReference(`Student ${proposal.studentId} does not exist`);
    if (!exists(state.teachers, proposal.secondTeacherId)) throw new InvalidReference(`Teacher ${proposal.secondTeacherId} does not exist`);
    if (!exists(state.slots, proposal.slotId)) throw new InvalidReference(`Slot ${proposal.slotId} is not a slot of the session`);
    if (!exists(state.rooms, proposal.roomId)) throw new InvalidReference(`Room ${proposal.roomId} is not a room of the session`);
  }

  private result(proposal: ProposedDefense, state: PlacementState): CheckResult {
    const violations = checkPlacement(proposal, state);
    const canSave = canBeSaved(violations);
    const student = state.students.find((s) => s.id === proposal.studentId)!;
    const tutorName = state.companyTutors.find((t) => t.id === student.companyTutorId)!.name;
    return {
      violations: violations.map(toViolationView),
      canSave,
      needsForce: canSave && violations.length > 0,
      hint: describeCompanyTutorDays(tutorName, companyTutorOtherDays(proposal, state)),
    };
  }

  /** The dry run: what would be wrong with this placement, without saving it. */
  async check(proposal: ProposedDefense): Promise<CheckResult> {
    const state = await this.loadState();
    this.checkIds(proposal, state);
    return this.result(proposal, state);
  }

  /** Runs every check, then saves with `save`, or throws PlacementRefused with the whole list. */
  private async checkThenSave(proposal: ProposedDefense, force: boolean, save: () => Promise<{ id: number }>): Promise<DefenseView> {
    const state = await this.loadState();
    this.checkIds(proposal, state);
    const result = this.result(proposal, state);
    if (!result.canSave || (result.needsForce && !force)) throw new PlacementRefused(result);

    try {
      const { id } = await save();
      return this.findOne(id);
    } catch (error) {
      // Another save got there first, between the check and this one: check again, with it.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new PlacementRefused(this.result(proposal, await this.loadState()));
      }
      throw error;
    }
  }

  async create(proposal: Omit<ProposedDefense, 'defenseId'>, force = false): Promise<DefenseView> {
    return this.checkThenSave(proposal, force, () =>
      this.prisma.defense.create({
        data: { studentId: proposal.studentId, secondTeacherId: proposal.secondTeacherId, slotId: proposal.slotId, roomId: proposal.roomId },
      }),
    );
  }

  /** A move: new slot, room or second teacher. The same checks, the defense left out of the state. */
  async move(id: number, patch: { slotId?: number; roomId?: number; secondTeacherId?: number }, force = false): Promise<DefenseView> {
    const defense = await this.prisma.defense.findUnique({ where: { id } });
    if (!defense) throw new NotFound('Defense', id);

    const proposal: ProposedDefense = {
      studentId: defense.studentId,
      secondTeacherId: patch.secondTeacherId ?? defense.secondTeacherId,
      slotId: patch.slotId ?? defense.slotId,
      roomId: patch.roomId ?? defense.roomId,
      defenseId: id,
    };
    return this.checkThenSave(proposal, force, () =>
      this.prisma.defense.update({
        where: { id },
        data: { secondTeacherId: proposal.secondTeacherId, slotId: proposal.slotId, roomId: proposal.roomId },
      }),
    );
  }

  async remove(id: number): Promise<void> {
    if (!(await this.prisma.defense.findUnique({ where: { id } }))) throw new NotFound('Defense', id);
    await this.prisma.defense.delete({ where: { id } });
  }

  private readonly include = {
    slot: true,
    room: true,
    secondTeacher: true,
    student: { include: { company: true, companyTutor: true, academicTutor: true } },
  } as const;

  /** Every placed defense, in time order, each with its current conflicts. */
  async findAll(): Promise<DefenseView[]> {
    const [rows, state] = await Promise.all([
      this.prisma.defense.findMany({ include: this.include, orderBy: [{ slot: { dayIndex: 'asc' } }, { slot: { indexInDay: 'asc' } }, { room: { name: 'asc' } }] }),
      this.loadState(),
    ]);
    return rows.map((row) => this.toView(row, state));
  }

  async findOne(id: number): Promise<DefenseView> {
    const [row, state] = await Promise.all([this.prisma.defense.findUnique({ where: { id }, include: this.include }), this.loadState()]);
    if (!row) throw new NotFound('Defense', id);
    return this.toView(row, state);
  }

  private toView(
    row: Prisma.DefenseGetPayload<{ include: DefensesService['include'] }>,
    state: PlacementState,
  ): DefenseView {
    const violations = checkPlacement(
      { studentId: row.studentId, secondTeacherId: row.secondTeacherId, slotId: row.slotId, roomId: row.roomId, defenseId: row.id },
      state,
    );
    return {
      id: row.id,
      slotId: row.slotId,
      roomId: row.roomId,
      day: toDay(row.slot.date),
      startMinutes: row.slot.startMinutes,
      halfDay: row.slot.halfDay,
      roomName: row.room.name,
      videoLink: row.room.videoLink,
      student: { id: row.student.id, name: fullName(row.student), companyName: row.student.company.name },
      academicTutor: { id: row.student.academicTutor.id, name: fullName(row.student.academicTutor) },
      secondTeacher: { id: row.secondTeacher.id, name: fullName(row.secondTeacher) },
      companyTutor: { id: row.student.companyTutor.id, name: fullName(row.student.companyTutor), email: row.student.companyTutor.email },
      violations: violations.map(toViolationView),
    };
  }
}
