import { AlreadyUsed, InvalidReference, NotFound } from '../src/common/errors.js';
import { CompaniesService } from '../src/companies/companies.service.js';
import { asPrisma, prismaMock, type PrismaMock } from './prisma-mock.js';

const company = { id: 1, name: 'Provence Microsystèmes' };
const tutor = { id: 5, firstName: 'Jean', lastName: 'Roux', email: 'jean.roux@provence.fr', companyId: 1 };

describe('CompaniesService', () => {
  let prisma: PrismaMock;
  let companies: CompaniesService;

  beforeEach(() => {
    prisma = prismaMock();
    companies = new CompaniesService(asPrisma(prisma));
  });

  it('refuses a company name already used', async () => {
    prisma.company.findUnique.mockResolvedValue(company);

    await expect(companies.create('Provence Microsystèmes')).rejects.toBeInstanceOf(AlreadyUsed);
  });

  it('throws NotFound when renaming an unknown company', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(companies.rename(9, 'X')).rejects.toBeInstanceOf(NotFound);
  });

  it('creates a tutor with a lower-cased email', async () => {
    prisma.company.findUnique.mockResolvedValue(company);
    prisma.companyTutor.findUnique.mockResolvedValue(null);
    prisma.companyTutor.create.mockResolvedValue({ ...tutor, company });

    const created = await companies.createTutor({ ...tutor, email: 'Jean.Roux@Provence.fr' });

    expect(prisma.companyTutor.create.mock.calls[0][0].data.email).toBe('jean.roux@provence.fr');
    expect(created.companyName).toBe('Provence Microsystèmes');
  });

  it('refuses a tutor for an unknown company', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(companies.createTutor(tutor)).rejects.toBeInstanceOf(InvalidReference);
  });

  it('refuses to move a tutor who still follows students to another company', async () => {
    prisma.companyTutor.findUnique.mockResolvedValue({ ...tutor, _count: { students: 2 } });
    prisma.company.findUnique.mockResolvedValue({ id: 2, name: 'Azur Data' });

    await expect(companies.updateTutor(5, { companyId: 2 })).rejects.toBeInstanceOf(InvalidReference);
    expect(prisma.companyTutor.update).not.toHaveBeenCalled();
  });
});
