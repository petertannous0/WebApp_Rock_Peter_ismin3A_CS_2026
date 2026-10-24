export interface StudentView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  hasAccount: boolean;
  company: { id: number; name: string };
  companyTutor: { id: number; name: string; email: string };
  academicTutor: { id: number; name: string };
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
