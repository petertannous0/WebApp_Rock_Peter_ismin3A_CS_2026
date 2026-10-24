export interface TeacherView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
  availabilitySubmittedAt?: string;
  tutoredCount: number;
}

export interface TeacherInput {
  firstName: string;
  lastName: string;
  email: string;
}
