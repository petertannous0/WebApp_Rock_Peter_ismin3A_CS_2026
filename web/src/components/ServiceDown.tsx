export const SERVICE_DOWN_TEXT = 'Le service est momentanément indisponible. Nous travaillons à le rétablir : revenez un peu plus tard.';

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
  onRetry: () => void;
  retrying: boolean;
}

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
