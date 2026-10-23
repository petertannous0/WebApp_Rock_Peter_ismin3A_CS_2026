import { AvailabilityForm } from './AvailabilityForm';

/** The teacher's home, at /enseignant: their unavailability (F1), then their defenses (F3). */
export const TeacherHomePage = () => {
  return (
    <section className="page">
      <h2>Mon espace enseignant</h2>
      <AvailabilityForm />
    </section>
  );
};
