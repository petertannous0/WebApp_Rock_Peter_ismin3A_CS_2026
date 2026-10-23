/** A teacher, the way the API exposes it. */
export interface TeacherView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  /** True once the admin has created their account. */
  hasAccount: boolean;
  /** When they last saved their unavailability; absent: they have not answered. */
  availabilitySubmittedAt?: string;
  /** How many students they are the academic tutor of. */
  tutoredCount: number;
}

export interface TeacherInput {
  firstName: string;
  lastName: string;
  email: string;
}
