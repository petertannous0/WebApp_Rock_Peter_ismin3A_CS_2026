import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiDownError, ApiError } from '../api';
import { ErrorAlert } from './ErrorAlert';
import { ViolationList } from './ViolationList';

describe('ViolationList', () => {
  it('shows the blocking violations first, then the warnings, each with its sentence', () => {
    render(
      <ViolationList
        violations={[
          { rule: 'TEACHER_UNAVAILABLE', severity: 'WARNING', message: 'Paul Durand a indiqué être indisponible le lundi 21 juin matin.' },
          { rule: 'ROOM_CLOSED', severity: 'BLOCKING', message: 'Salle C est fermée le jeudi après-midi (jeudi 24 juin).' },
        ]}
      />,
    );

    const items = within(screen.getByRole('list', { name: 'Conflits' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Bloquant Salle C est fermée le jeudi après-midi (jeudi 24 juin).',
      'Avertissement Paul Durand a indiqué être indisponible le lundi 21 juin matin.',
    ]);
    expect(items[0]).toHaveClass('blocking');
    expect(items[1]).toHaveClass('warning');
  });
});

describe('ErrorAlert', () => {
  it("uses the page's own sentence for an expected status", () => {
    render(<ErrorAlert error={new ApiError(409, 'x')} messages={{ 409: 'Cette adresse e-mail est déjà utilisée.' }} fallback="Échec" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Cette adresse e-mail est déjà utilisée.');
  });

  it('lists what the API explained on a 400', () => {
    render(<ErrorAlert error={new ApiError(400, 'x', ['email must be an email', 'name should not be empty'])} fallback="Échec" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Le formulaire contient des erreurs');
    expect(within(alert).getAllByRole('listitem')).toHaveLength(2);
  });

  it('falls back to its sentence and the error message otherwise', () => {
    render(<ErrorAlert error={new ApiError(500, "L'API a répondu 500")} fallback="Impossible d’enregistrer" />);

    expect(screen.getByRole('alert')).toHaveTextContent("Impossible d’enregistrer : L'API a répondu 500");
  });
});

describe('ErrorAlert, the API down', () => {
  it('says the service is down instead of the error of the request', () => {
    render(<ErrorAlert error={new ApiDownError()} fallback="Impossible de charger les élèves" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Service indisponible.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Impossible de charger');
  });
});
