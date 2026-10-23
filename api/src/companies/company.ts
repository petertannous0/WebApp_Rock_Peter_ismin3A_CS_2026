/** A company, with its tutors: the admin page shows them together. */
export interface CompanyView {
  id: number;
  name: string;
  studentCount: number;
  tutors: CompanyTutorView[];
}

/** A company tutor: no account, name and email only. */
export interface CompanyTutorView {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyId: number;
  companyName: string;
}
