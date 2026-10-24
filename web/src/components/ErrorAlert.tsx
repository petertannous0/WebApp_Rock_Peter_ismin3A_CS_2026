import { ApiError, isApiDown } from '../api';
import { ServiceDownAlert } from './ServiceDown';

interface ErrorAlertProps {
  error: unknown;
  messages?: Partial<Record<number, string>>;
  fallback: string;
}

export const ErrorAlert = ({ error, messages = {}, fallback }: ErrorAlertProps) => {
  if (isApiDown(error)) return <ServiceDownAlert />;

  const status = error instanceof ApiError ? error.status : undefined;
  const text =
    status === 400
      ? 'Le formulaire contient des erreurs :'
      : ((status !== undefined ? messages[status] : undefined) ??
        `${fallback} : ${error instanceof Error ? error.message : String(error)}`);

  return (
    <div className="error form-error" role="alert">
      <p>{text}</p>
      {error instanceof ApiError && status === 400 && (
        <ul>
          {error.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
