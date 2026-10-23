import { ApiError } from '../api';

interface ErrorAlertProps {
  error: unknown;
  /** What the user reads for each status the page expects: 404, 409, 422… */
  messages?: Partial<Record<number, string>>;
  /** The start of the sentence for any other error: "Impossible d'enregistrer". */
  fallback: string;
}

/**
 * The error of a request, in French. A 400 lists what the API explained, one
 * line per invalid field; an expected status gets the page's own sentence.
 */
export const ErrorAlert = ({ error, messages = {}, fallback }: ErrorAlertProps) => {
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
