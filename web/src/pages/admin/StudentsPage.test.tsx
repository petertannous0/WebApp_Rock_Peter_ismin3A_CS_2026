import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { COMPANIES, STUDENTS, TEACHERS } from '../../fixtures';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../../test-utils';

const token = makeToken({ role: 'ADMIN' });

function api(post: () => Response = () => Response.json(STUDENTS[1], { status: 201 })) {
  return fakeApi({
    'GET /students': () => Response.json(STUDENTS),
    'GET /companies': () => Response.json(COMPANIES),
    'GET /teachers': () => Response.json(TEACHERS),
    'POST /students': post,
    'PATCH /students/12': () => Response.json(STUDENTS[0]),
  });
}

async function fillNewStudent() {
  await userEvent.type(screen.getByLabelText('Prénom'), 'Zoé');
  await userEvent.type(screen.getByLabelText('Nom'), 'Blanc');
  await userEvent.type(screen.getByLabelText('E-mail'), 'zoe.blanc@etu.castelmont.fr');
  await userEvent.selectOptions(screen.getByLabelText('Entreprise'), 'Azur Data');
  await userEvent.selectOptions(screen.getByLabelText('Tuteur entreprise'), 'Inès Faure');
  await userEvent.selectOptions(screen.getByLabelText('Tuteur académique'), '7');
}

describe('StudentsPage', () => {
  it('lists the students with their company, tutors and placement', async () => {
    api();
    renderApp('/admin/eleves', { token });

    const row = (await screen.findByText('Martin Léa')).closest('tr')!;
    expect(within(row).getByText('Provence Microsystèmes')).toBeInTheDocument();
    expect(within(row).getByText('Jean Roux')).toBeInTheDocument();
    expect(within(row).getByText('Paul Durand')).toBeInTheDocument();
    expect(within(row).getByText('Placée')).toBeInTheDocument();
  });

  it('offers only the tutors of the chosen company', async () => {
    api();
    renderApp('/admin/eleves', { token });

    await screen.findByText('Martin Léa');
    await userEvent.selectOptions(screen.getByLabelText('Entreprise'), 'Azur Data');

    const tutors = within(screen.getByLabelText('Tuteur entreprise')).getAllByRole('option').map((o) => o.textContent);
    expect(tutors).toEqual(['— Choisir —', 'Inès Faure']);
  });

  it('POSTs a new student with numeric ids', async () => {
    const requests = api();
    renderApp('/admin/eleves', { token });
    await screen.findByText('Martin Léa');

    await fillNewStudent();
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const post = requests.find((request) => request.method === 'POST' && pathOf(request) === '/students')!;
    await expect(post.json()).resolves.toEqual({
      firstName: 'Zoé',
      lastName: 'Blanc',
      email: 'zoe.blanc@etu.castelmont.fr',
      companyId: 2,
      companyTutorId: 6,
      academicTutorId: 7,
    });
  });

  it('edits an existing student with PATCH', async () => {
    const requests = api();
    renderApp('/admin/eleves', { token });

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Léa Martin' }));
    expect(screen.getByRole('heading', { name: 'Modifier l’élève' })).toBeInTheDocument();
    expect(screen.getByLabelText('Prénom')).toHaveValue('Léa');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(requests.some((request) => request.method === 'PATCH' && pathOf(request) === '/students/12')).toBe(true);
  });

  it('says so when the email is already used (409)', async () => {
    api(() => nestError(409, 'Email already used'));
    renderApp('/admin/eleves', { token });
    await screen.findByText('Martin Léa');

    await fillNewStudent();
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cette adresse e-mail est déjà utilisée.');
  });

  it('filters the list with the search box', async () => {
    api();
    renderApp('/admin/eleves', { token });
    await screen.findByText('Martin Léa');

    await userEvent.type(screen.getByLabelText('Rechercher'), 'azur');

    expect(screen.queryByText('Martin Léa')).not.toBeInTheDocument();
    expect(screen.getByText('Petit Hugo')).toBeInTheDocument();
  });
});
