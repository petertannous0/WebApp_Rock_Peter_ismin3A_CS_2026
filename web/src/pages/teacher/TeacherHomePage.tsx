import { AvailabilityForm } from './AvailabilityForm';
import { TeacherSchedule } from './TeacherSchedule';

/** The teacher's home, at /enseignant: their defenses (F3), and their unavailability (F1). */
export const TeacherHomePage = () => {
  return (
    <section className="page">
      <h2>Mon espace enseignant</h2>
      <TeacherSchedule />
      <AvailabilityForm />
    </section>
  );
};
