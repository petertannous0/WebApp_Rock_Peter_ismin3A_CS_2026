/**
 * The conflict checker: the core of F2. Pure and framework-free: no NestJS,
 * no Prisma, no clock. In: a proposed defense and the current state. Out:
 * the list of every rule it breaks, typed. The service loads the state and
 * decides what to do with the list; the tests call it directly.
 *
 * The jury of a defense is the student's academic tutor + the second teacher
 * + the student's company tutor. Rules 1, 2 and 5 apply to both teachers.
 */

import { THURSDAY, type HalfDay } from '../session/slots.js';

// ─── The state ─────────────────────────────────────────────────────────────

export interface SlotInfo {
  id: number;
  /** "YYYY-MM-DD" */
  day: string;
  /** 0 = Monday … 4 = Friday */
  dayIndex: number;
  startMinutes: number;
  halfDay: HalfDay;
}

export interface RoomInfo {
  id: number;
  name: string;
  closedThursdayAfternoon: boolean;
}

export interface PersonInfo {
  id: number;
  name: string;
}

export interface StudentInfo extends PersonInfo {
  companyId: number;
  companyName: string;
  companyTutorId: number;
  academicTutorId: number;
}

export interface UnavailabilityInfo {
  teacherId: number;
  day: string;
  halfDay: HalfDay;
}

export interface PlacedDefense {
  id: number;
  studentId: number;
  secondTeacherId: number;
  slotId: number;
  roomId: number;
}

/** Everything the rules need to know, already loaded. */
export interface PlacementState {
  slots: SlotInfo[];
  rooms: RoomInfo[];
  teachers: PersonInfo[];
  companyTutors: PersonInfo[];
  students: StudentInfo[];
  unavailabilities: UnavailabilityInfo[];
  defenses: PlacedDefense[];
}

/** What the admin chooses: the academic tutor and the company tutor come from the student. */
export interface ProposedDefense {
  studentId: number;
  secondTeacherId: number;
  slotId: number;
  roomId: number;
  /** When moving a defense: its id. It is left out of the state, it does not conflict with itself. */
  defenseId?: number;
}

// ─── The violations ────────────────────────────────────────────────────────

/** Where and when another defense is: to say "with whom, at what time, in which room". */
export interface OtherDefense {
  studentName: string;
  day: string;
  startMinutes: number;
  roomName: string;
}

export type Violation =
  /** Rule 1: a teacher of the jury already sits on another jury at that slot. */
  | { rule: 'TEACHER_BUSY'; teacher: PersonInfo; other: OtherDefense }
  /** Rule 2: a teacher of the jury said they are unavailable that half-day. */
  | { rule: 'TEACHER_UNAVAILABLE'; teacher: PersonInfo; day: string; halfDay: HalfDay }
  /** Rule 3: the room already hosts a defense at that slot. */
  | { rule: 'ROOM_TAKEN'; roomName: string; other: OtherDefense }
  /** Rule 4: the room is closed then (Thursday afternoon). */
  | { rule: 'ROOM_CLOSED'; roomName: string; day: string }
  /** Rule 5: a teacher would sit on more than 6 juries that day. `count` includes this one. */
  | { rule: 'TEACHER_OVERLOADED'; teacher: PersonInfo; day: string; count: number }
  /** Rule 6: the company tutor already sits on another jury at that slot. */
  | { rule: 'COMPANY_TUTOR_BUSY'; companyTutor: PersonInfo; other: OtherDefense }
  /** Rule 7: the second teacher is the academic tutor of another student of the same company. */
  | { rule: 'SAME_COMPANY'; secondTeacher: PersonInfo; otherStudentName: string; companyName: string }
  /** Rule 8: the second teacher is the student's own academic tutor. */
  | { rule: 'SECOND_TEACHER_IS_ACADEMIC_TUTOR'; teacher: PersonInfo; studentName: string }
  /** Rule 9: the student already has a defense. */
  | { rule: 'STUDENT_ALREADY_PLACED'; studentName: string; other: OtherDefense };

export type Rule = Violation['rule'];
export type Severity = 'BLOCKING' | 'WARNING';

/**
 * Decision P5-a (option B): what blocks the save, and what only warns with
 * "save anyway". Two rules warn: the admin may have agreed otherwise with the
 * teacher on the phone. Everything else is a physical or a client's hard rule.
 */
export const SEVERITY: Record<Rule, Severity> = {
  TEACHER_BUSY: 'BLOCKING',
  TEACHER_UNAVAILABLE: 'WARNING',
  ROOM_TAKEN: 'BLOCKING',
  ROOM_CLOSED: 'BLOCKING',
  TEACHER_OVERLOADED: 'WARNING',
  COMPANY_TUTOR_BUSY: 'BLOCKING',
  SAME_COMPANY: 'BLOCKING',
  SECOND_TEACHER_IS_ACADEMIC_TUTOR: 'BLOCKING',
  STUDENT_ALREADY_PLACED: 'BLOCKING',
};

/** The client's limit: at most 6 defenses per teacher per day. */
export const MAX_DEFENSES_PER_TEACHER_PER_DAY = 6;

/** A proposed defense points at an id the state does not hold: a bug of the caller, not a rule. */
export class UnknownId extends Error {
  constructor(what: string, id: number) {
    super(`Unknown ${what} ${id}`);
  }
}

// ─── The checker ───────────────────────────────────────────────────────────

function find<T extends { id: number }>(list: T[], id: number, what: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new UnknownId(what, id);
  return found;
}

/** True when the room is closed during this slot: Thursday afternoon, for the rooms marked so. */
export function isRoomClosed(room: RoomInfo, slot: SlotInfo): boolean {
  return room.closedThursdayAfternoon && slot.dayIndex === THURSDAY && slot.halfDay === 'AFTERNOON';
}

/** Every rule the proposed defense breaks, in the order of the rules. Empty: it can be saved. */
export function checkPlacement(proposed: ProposedDefense, state: PlacementState): Violation[] {
  const student = find(state.students, proposed.studentId, 'student');
  const slot = find(state.slots, proposed.slotId, 'slot');
  const room = find(state.rooms, proposed.roomId, 'room');
  const secondTeacher = find(state.teachers, proposed.secondTeacherId, 'teacher');
  const academicTutor = find(state.teachers, student.academicTutorId, 'teacher');
  const companyTutor = find(state.companyTutors, student.companyTutorId, 'company tutor');

  // The defense being moved does not conflict with itself.
  const others = state.defenses.filter((defense) => defense.id !== proposed.defenseId);

  const studentOf = (defense: PlacedDefense) => find(state.students, defense.studentId, 'student');
  const slotOf = (defense: PlacedDefense) => find(state.slots, defense.slotId, 'slot');
  const teachersOf = (defense: PlacedDefense) => [studentOf(defense).academicTutorId, defense.secondTeacherId];
  const describe = (defense: PlacedDefense): OtherDefense => {
    const otherSlot = slotOf(defense);
    return {
      studentName: studentOf(defense).name,
      day: otherSlot.day,
      startMinutes: otherSlot.startMinutes,
      roomName: find(state.rooms, defense.roomId, 'room').name,
    };
  };

  // Both teachers, once each: when rule 8 is broken they are the same person.
  const juryTeachers = academicTutor.id === secondTeacher.id ? [academicTutor] : [academicTutor, secondTeacher];
  const sameSlot = others.filter((defense) => defense.slotId === slot.id);

  const violations: Violation[] = [];

  // Rule 1: a teacher already on another jury at that slot.
  for (const teacher of juryTeachers) {
    for (const defense of sameSlot.filter((d) => teachersOf(d).includes(teacher.id))) {
      violations.push({ rule: 'TEACHER_BUSY', teacher, other: describe(defense) });
    }
  }

  // Rule 2: a teacher unavailable that half-day.
  for (const teacher of juryTeachers) {
    const unavailable = state.unavailabilities.some(
      (u) => u.teacherId === teacher.id && u.day === slot.day && u.halfDay === slot.halfDay,
    );
    if (unavailable) violations.push({ rule: 'TEACHER_UNAVAILABLE', teacher, day: slot.day, halfDay: slot.halfDay });
  }

  // Rule 3: the room already used at that slot.
  for (const defense of sameSlot.filter((d) => d.roomId === room.id)) {
    violations.push({ rule: 'ROOM_TAKEN', roomName: room.name, other: describe(defense) });
  }

  // Rule 4: the room closed (Thursday afternoon).
  if (isRoomClosed(room, slot)) violations.push({ rule: 'ROOM_CLOSED', roomName: room.name, day: slot.day });

  // Rule 5: more than 6 defenses that day for a teacher, this one included.
  for (const teacher of juryTeachers) {
    const sameDay = others.filter((d) => slotOf(d).day === slot.day && teachersOf(d).includes(teacher.id)).length;
    const count = sameDay + 1;
    if (count > MAX_DEFENSES_PER_TEACHER_PER_DAY) {
      violations.push({ rule: 'TEACHER_OVERLOADED', teacher, day: slot.day, count });
    }
  }

  // Rule 6: the company tutor already on another jury at that slot.
  for (const defense of sameSlot.filter((d) => studentOf(d).companyTutorId === companyTutor.id)) {
    violations.push({ rule: 'COMPANY_TUTOR_BUSY', companyTutor, other: describe(defense) });
  }

  // Rule 7: the second teacher is the academic tutor of another student of the same company.
  for (const other of state.students) {
    if (other.id !== student.id && other.companyId === student.companyId && other.academicTutorId === secondTeacher.id) {
      violations.push({ rule: 'SAME_COMPANY', secondTeacher, otherStudentName: other.name, companyName: student.companyName });
    }
  }

  // Rule 8: the second teacher is the student's own academic tutor.
  if (secondTeacher.id === academicTutor.id) {
    violations.push({ rule: 'SECOND_TEACHER_IS_ACADEMIC_TUTOR', teacher: secondTeacher, studentName: student.name });
  }

  // Rule 9: the student already has a defense.
  for (const defense of others.filter((d) => d.studentId === student.id)) {
    violations.push({ rule: 'STUDENT_ALREADY_PLACED', studentName: student.name, other: describe(defense) });
  }

  return violations;
}

/** True when nothing blocks: the save goes through, with `force` if there are warnings. */
export function canBeSaved(violations: Violation[]): boolean {
  return violations.every((violation) => SEVERITY[violation.rule] !== 'BLOCKING');
}

/**
 * Not a rule: an informational hint. The company tutor already comes on other
 * days for other students; grouping them on one day would spare a trip.
 * The days are returned sorted, without the day of the proposed slot.
 */
export function companyTutorOtherDays(proposed: ProposedDefense, state: PlacementState): string[] {
  const student = find(state.students, proposed.studentId, 'student');
  const slot = find(state.slots, proposed.slotId, 'slot');
  const days = new Set<string>();
  for (const defense of state.defenses) {
    if (defense.id === proposed.defenseId || defense.studentId === student.id) continue;
    if (find(state.students, defense.studentId, 'student').companyTutorId !== student.companyTutorId) continue;
    const day = find(state.slots, defense.slotId, 'slot').day;
    if (day !== slot.day) days.add(day);
  }
  return [...days].sort();
}
