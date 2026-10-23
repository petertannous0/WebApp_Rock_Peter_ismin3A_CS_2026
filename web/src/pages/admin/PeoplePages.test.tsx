import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { COMPANIES, TEACHERS } from '../../fixtures';
import { fakeApi, makeToken, nestError, pathOf, renderApp } from '../../test-utils';

const token = makeToken({ role: 'ADMIN' });

const lastBody = (requests: Request[], method: string, path: string) =>
  requests.filter((r) => r.method === method && pathOf(r) === path).at(-1)!.json();

describe('CompaniesPage', () => {
  function api(overrides: Record<string, () => Response> = {}) {
    return fakeApi({
      'GET /companies': () => Response.json(COMPANIES),
      'POST /companies': () => Response.json({ id: 3, name: 'Luberon Robotique', studentCount: 0, tutors: [] }, { status: 201 }),
      'PATCH /companies/1': () => Response.json(COMPANIES[0]),
      'POST /company-tutors': () => Response.json(COMPANIES[1].tutors[0], { status: 201 }),
      'PATCH /company-tutors/5': () => Response.json(COMPANIES[0].tutors[0]),
      ...overrides,
    });
  }

  it('lists each company with its students count and its tutors', async () => {
    api();
    renderApp('/admin/entreprises', { token });

    const row = (await screen.findByText(/Provence Microsystèmes/, { selector: 'td' })).closest('tr')!;
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText(/Jean Roux · jean.roux@provence.fr/)).toBeInTheDocument();
  });

  it('adds a company', async () => {
    const requests = api();
    renderApp('/admin/entreprises', { token });
    await screen.findByText(/Azur Data/, { selector: 'td' });

    await userEvent.type(screen.getByLabelText('Nom de l’entreprise'), 'Luberon Robotique');
    await userEvent.click(within(screen.getByRole('form', { name: 'Entreprise' })).getByRole('button', { name: 'Enregistrer' }));

    await expect(lastBody(requests, 'POST', '/companies')).resolves.toEqual({ name: 'Luberon Robotique' });
  });

  it('renames a company with PATCH', async () => {
    const requests = api();
    renderApp('/admin/entreprises', { token });

    await userEvent.click(await screen.findByRole('button', { name: 'Renommer Provence Microsystèmes' }));
    const name = screen.getByLabelText('Nom de l’entreprise');
    await userEvent.clear(name);
    await userEvent.type(name, 'Provence Micro');
    await userEvent.click(within(screen.getByRole('form', { name: 'Entreprise' })).getByRole('button', { name: 'Enregistrer' }));

    await expect(lastBody(requests, 'PATCH', '/companies/1')).resolves.toEqual({ name: 'Provence Micro' });
  });

  it('adds a company tutor to a company, the id as a number', async () => {
    const requests = api();
    renderApp('/admin/entreprises', { token });
    await screen.findByText(/Azur Data/, { selector: 'td' });

    const form = screen.getByRole('form', { name: 'Tuteur entreprise' });
    await userEvent.selectOptions(within(form).getByLabelText('Entreprise'), 'Azur Data');
    await userEvent.type(within(form).getByLabelText('Prénom'), 'Rose');
    await userEvent.type(within(form).getByLabelText('Nom'), 'Faure');
    await userEvent.type(within(form).getByLabelText('E-mail'), 'rose.faure@azur.fr');
    await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));

    await expect(lastBody(requests, 'POST', '/company-tutors')).resolves.toEqual({ firstName: 'Rose', lastName: 'Faure', email: 'rose.faure@azur.fr', companyId: 2 });
  });

  it('explains why a tutor who still follows students cannot change company (422)', async () => {
    api({ 'PATCH /company-tutors/5': () => nestError(422, 'still follows students') });
    renderApp('/admin/entreprises', { token });

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Jean Roux' }));
    const form = screen.getByRole('form', { name: 'Tuteur entreprise' });
    await userEvent.selectOptions(within(form).getByLabelText('Entreprise'), 'Azur Data');
    await userEvent.click(within(form).getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ce tuteur suit encore des élèves de son entreprise');
  });
});

describe('TeachersPage', () => {
  function api(post: () => Response = () => Response.json(TEACHERS[0], { status: 201 })) {
    return fakeApi({
      'GET /teachers': () => Response.json(TEACHERS),
      'POST /teachers': post,
      'PATCH /teachers/7': () => Response.json(TEACHERS[0]),
    });
  }

  it('shows for each teacher: tutored students, account, and whether they answered', async () => {
    api();
    renderApp('/admin/enseignants', { token });

    const durand = (await screen.findByText('Durand Paul')).closest('tr')!;
    expect(durand).toHaveTextContent('2 élève(s)');
    expect(durand).toHaveTextContent('Oui');
    expect(durand).toHaveTextContent('Saisies le 10/05/2027');
    expect(screen.getByText('Roux Anna').closest('tr')).toHaveTextContent('Non saisies');
  });

  it('adds a teacher', async () => {
    const requests = api();
    renderApp('/admin/enseignants', { token });
    await screen.findByText('Durand Paul');

    await userEvent.type(screen.getByLabelText('Prénom'), 'Tom');
    await userEvent.type(screen.getByLabelText('Nom'), 'Blanc');
    await userEvent.type(screen.getByLabelText('E-mail'), 'tom.blanc@castelmont.fr');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await expect(lastBody(requests, 'POST', '/teachers')).resolves.toEqual({ firstName: 'Tom', lastName: 'Blanc', email: 'tom.blanc@castelmont.fr' });
  });

  it('edits a teacher with PATCH, pre-filled', async () => {
    const requests = api();
    renderApp('/admin/enseignants', { token });

    await userEvent.click(await screen.findByRole('button', { name: 'Modifier Paul Durand' }));
    expect(screen.getByLabelText('E-mail')).toHaveValue('paul.durand@castelmont.fr');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(requests.some((r) => r.method === 'PATCH' && pathOf(r) === '/teachers/7')).toBe(true);
  });

  it('says so when the email is already used (409)', async () => {
    api(() => nestError(409, 'Email already used'));
    renderApp('/admin/enseignants', { token });
    await screen.findByText('Durand Paul');

    await userEvent.type(screen.getByLabelText('Prénom'), 'Tom');
    await userEvent.type(screen.getByLabelText('Nom'), 'Blanc');
    await userEvent.type(screen.getByLabelText('E-mail'), 'paul.durand@castelmont.fr');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cette adresse e-mail est déjà utilisée.');
  });
});
