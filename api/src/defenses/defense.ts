import type { HalfDay } from '../session/slots.js';
import type { Rule, Severity } from './conflicts.js';

export interface ViolationView {
  rule: Rule;
  severity: Severity;
  message: string;
}

export interface CheckResult {
  violations: ViolationView[];
  canSave: boolean;
  needsForce: boolean;
  hint?: string;
}

export interface DefenseView {
  id: number;
  slotId: number;
  roomId: number;
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

export class PlacementRefused extends Error {
  constructor(readonly result: CheckResult) {
    super(result.canSave ? 'Placement à confirmer : avertissements' : 'Placement refusé : règles non respectées');
  }
}
