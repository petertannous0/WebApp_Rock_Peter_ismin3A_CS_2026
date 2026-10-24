export interface CompanyView {
  id: number;
  name: string;
  studentCount: number;
  tutors: CompanyTutorView[];
}

export interface CompanyTutorView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyId: number;
  companyName: string;
}
