/** A student, the way the API exposes it: with what the jury and the same-company rule need. */
export interface StudentView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  /** True once the admin has created their account. */
  hasAccount: boolean;
  company: { id: number; name: string };
  companyTutor: { id: number; name: string; email: string };
  academicTutor: { id: number; name: string };
  /** True when their defense is placed. */
  placed: boolean;
}

export interface StudentInput {
  firstName: string;
  lastName: string;
  email: string;
  companyId: number;
  companyTutorId: number;
  academicTutorId: number;
}
