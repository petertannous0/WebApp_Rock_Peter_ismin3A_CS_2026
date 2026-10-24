/** The sentence of every "API down" message: the problem is known, come back later. */
export const SERVICE_DOWN_TEXT = 'Le service est momentanément indisponible. Nous travaillons à le rétablir : revenez un peu plus tard.';

/** The same message inside a page, in place of the error of one request. */
export const ServiceDownAlert = () => {
  return (
    <div className="error service-down-alert" role="alert">
      <p>
        <span aria-hidden="true">😢</span> <strong>Service indisponible.</strong> {SERVICE_DOWN_TEXT}
      </p>
    </div>
  );
};

interface ServiceDownProps {
  /** Asks the API again now, instead of waiting for the next check. */
  onRetry: () => void;
  /** True while that check runs. */
  retrying: boolean;
}

/**
 * The page shown in place of every page while the API cannot be reached
 * (useApiHealth). It goes away by itself as soon as the API answers again.
 */
export const ServiceDown = ({ onRetry, retrying }: ServiceDownProps) => {
  return (
    <section className="page service-down" role="alert">
      <p className="service-down-icon" aria-hidden="true">
        😢
      </p>
      <h2>Service indisponible</h2>
      <p>{SERVICE_DOWN_TEXT}</p>
      <button className="button" type="button" disabled={retrying} onClick={onRetry}>
        {retrying ? 'Vérification…' : 'Réessayer'}
      </button>
    </section>
  );
};
