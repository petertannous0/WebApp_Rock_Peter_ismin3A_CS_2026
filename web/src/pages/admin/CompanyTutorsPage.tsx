import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { fetchCompanyTutorSchedules } from '../../api';
import { useAuth } from '../../auth/AuthProvider';
import { useLogoutOn401 } from '../../auth/useLogoutOn401';
import { ErrorAlert } from '../../components/ErrorAlert';
import { companyTutorEmailText } from '../../schedule';
import type { CompanyTutorSchedule } from '../../types';

/**
 * The company tutors' defenses, at /admin/tuteurs (F3). They have no account:
 * one ready-to-send text per tutor, to copy into an email. The app sends none.
 */
export const CompanyTutorsPage = () => {
  const { token } = useAuth();
  const schedules = useQuery({ queryKey: ['company-tutor-schedules'], queryFn: () => fetchCompanyTutorSchedules(token!) });
  useLogoutOn401(schedules.error);
  const [onlyWithDefenses, setOnlyWithDefenses] = useState(true);
  const [search, setSearch] = useState('');

  const needle = search.trim().toLowerCase();
  const shown = (schedules.data ?? []).filter(
    (tutor) => (!onlyWithDefenses || tutor.defenses.length > 0) && `${tutor.name} ${tutor.companyName}`.toLowerCase().includes(needle),
  );

  return (
    <section className="page">
      <h2>Tuteurs entreprise</h2>
      <p className="hint">Les tuteurs entreprise n’ont pas de compte : copiez le texte de chacun dans un e-mail.</p>

      <div className="toolbar">
        <label className="checkbox">
          <input type="checkbox" checked={onlyWithDefenses} onChange={(event) => setOnlyWithDefenses(event.target.checked)} />
          Seulement ceux qui ont une soutenance placée
        </label>
        <input type="search" aria-label="Rechercher un tuteur" placeholder="Nom, entreprise…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {schedules.isPending && (
        <p className="status" role="status">
          Chargement…
        </p>
      )}
      {schedules.isError && <ErrorAlert error={schedules.error} fallback="Impossible de charger les tuteurs" />}
      {schedules.data && shown.length === 0 && <p className="hint">Aucun tuteur à afficher.</p>}
      <div className="tutor-cards">
        {shown.map((tutor) => (
          <TutorCard key={tutor.id} tutor={tutor} />
        ))}
      </div>
    </section>
  );
};

const TutorCard = ({ tutor }: { tutor: CompanyTutorSchedule }) => {
  const [copied, setCopied] = useState<'done' | 'manual' | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const text = companyTutorEmailText(tutor);

  // The clipboard API needs a secure origin; elsewhere the text is selected for a Ctrl+C.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('done');
    } catch {
      textarea.current?.select();
      setCopied('manual');
    }
  };

  return (
    <article className="panel tutor-card" aria-label={tutor.name}>
      <h3>{tutor.name}</h3>
      <p className="hint">
        {tutor.companyName} · {tutor.email} · {tutor.defenses.length} soutenance(s)
      </p>
      {tutor.defenses.length === 0 ? (
        <p>Aucune soutenance placée.</p>
      ) : (
        <>
          <textarea ref={textarea} readOnly aria-label={`Texte pour ${tutor.name}`} value={text} rows={7 + 2 * tutor.defenses.length} />
          <div className="actions">
            <button className="button" type="button" onClick={() => void copy()}>
              Copier
            </button>
            {copied && (
              <span className="success" role="status">
                {copied === 'done' ? 'Copié' : 'Texte sélectionné : Ctrl+C pour le copier'}
              </span>
            )}
          </div>
        </>
      )}
    </article>
  );
};
