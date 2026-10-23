/** A teacher, the way the API exposes it. */
export interface TeacherView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  /** True once the admin has created their account. */
  hasAccount: boolean;
}
