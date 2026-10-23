import type { HalfDay } from '../session/slots.js';
import type { Rule, Severity } from './conflicts.js';

/** A violation, the way the API sends it: the rule, whether it blocks, and the French sentence. */
export interface ViolationView {
  rule: Rule;
  severity: Severity;
  message: string;
}

/** The answer of a check: what is wrong, and what the admin can do about it. */
export interface CheckResult {
  violations: ViolationView[];
  /** No blocking violation. */
  canSave: boolean;
  /** Only warnings: the save needs `force: true`, "save anyway". */
  needsForce: boolean;
  /** Informational, never blocking: the company tutor already comes on another day. */
  hint?: string;
}

/** A placed defense, with its whole jury, and the conflicts it has now. */
export interface DefenseView {
  id: number;
  slotId: number;
  roomId: number;
  /** "YYYY-MM-DD" */
  day: string;
  startMinutes: number;
  halfDay: HalfDay;
  roomName: string;
  videoLink: string;
  student: { id: number; name: string; companyName: string };
  academicTutor: { id: number; name: string };
  secondTeacher: { id: number; name: string };
  companyTutor: { id: number; name: string; email: string };
  /**
   * Recomputed at each read: a teacher may have become unavailable, a room
   * closed, a student changed tutor since it was placed.
   */
  violations: ViolationView[];
}

/** The placement breaks a blocking rule, or only warnings without `force`. */
export class PlacementRefused extends Error {
  constructor(readonly result: CheckResult) {
    super(result.canSave ? 'Placement à confirmer : avertissements' : 'Placement refusé : règles non respectées');
  }
}
