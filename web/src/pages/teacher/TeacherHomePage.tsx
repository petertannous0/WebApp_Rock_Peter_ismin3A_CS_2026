import { AvailabilityForm } from './AvailabilityForm';
import { TeacherSchedule } from './TeacherSchedule';

export const TeacherHomePage = () => {
  return (
    <section className="page">
      <h2>Mon espace enseignant</h2>
      <TeacherSchedule />
      <AvailabilityForm />
    </section>
  );
};
