/**
 * Populates an empty database with a realistic session. Deterministic: a
 * fixed-seed random generator, so every run produces the same data.
 *
 *   npm run db:seed
 *
 * Runs at every `docker compose up` (service `migrate`): when a session
 * already exists, it does nothing, so the admin's changes are never overwritten.
 * Same for the accounts: seeded only when there is none.
 *
 *   - the session: Monday 21 – Friday 25 June 2027, 4 rooms, 60 slots,
 *     rooms C and D closed on Thursday afternoon
 *   - 35 teachers, each the academic tutor of 2 to 4 students
 *   - 65 companies, 100 students: 10 companies with 3 students, 15 with 2,
 *     most of them sharing one company tutor (same-company rule, tutor clashes)
 *   - 25 teachers have entered their unavailability, 10 have not
 *   - 10 defenses already placed on Monday morning, all valid
 *   - 3 demo accounts: the admin, a teacher and a student (password below)
 */
import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient, type Room, type Student, type Teacher } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/auth/password.js';
import { generateSlots } from '../src/session/slots.js';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

// ─── Deterministic randomness ──────────────────────────────────────────────

/** mulberry32: a tiny generator with a fixed seed. Same seed, same sequence. */
function generator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = generator(2027);

function shuffle<T>(list: readonly T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Names ─────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Léa', 'Hugo', 'Chloé', 'Lucas', 'Emma', 'Louis', 'Manon', 'Gabriel', 'Camille', 'Arthur',
  'Inès', 'Jules', 'Sarah', 'Nathan', 'Jade', 'Raphaël', 'Lina', 'Adam', 'Zoé', 'Tom',
  'Clara', 'Théo', 'Alice', 'Paul', 'Louise', 'Noah', 'Juliette', 'Ethan', 'Anna', 'Maxime',
  'Rose', 'Victor', 'Eva', 'Antoine', 'Agathe', 'Martin', 'Margaux', 'Simon', 'Lou', 'Mathis',
  'Nina', 'Baptiste', 'Romane', 'Clément', 'Elsa', 'Yanis', 'Mila', 'Samuel', 'Pauline', 'Enzo',
];

const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Morel', 'Girard', 'André', 'Lefèvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez',
  'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guérin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
  'Perrin', 'Morin', 'Mathieu', 'Clément', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin',
  'Masson', 'Sanchez', 'Gérard', 'Nguyen', 'Boyer', 'Denis', 'Lemaire', 'Duval', 'Joly', 'Gautier',
];

const COMPANY_PREFIXES = ['Provence', 'Azur', 'Calanque', 'Mistral', 'Lumière', 'Sainte-Victoire', 'Luberon', 'Camargue', 'Durance', 'Estérel'];
const COMPANY_SUFFIXES = ['Microsystèmes', 'Électronique', 'Semiconducteurs', 'Énergie', 'Robotique', 'Logiciel', 'Aéro', 'Santé', 'Data', 'Photonique'];

/** "Léa Lefèvre" → "lea.lefevre" */
function slug(...parts: string[]): string {
  return parts
    .map((part) => part.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '-'))
    .join('.');
}

const usedNames = new Set<string>();

/** A first and last name never given to anyone else in the seed. */
function newPerson(): { firstName: string; lastName: string } {
  for (;;) {
    const firstName = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const key = `${firstName} ${lastName}`;
    if (!usedNames.has(key)) {
      usedNames.add(key);
      return { firstName, lastName };
    }
  }
}

// ─── The seed ──────────────────────────────────────────────────────────────

const SESSION_NAME = 'Soutenances 3A, juin 2027';
const MONDAY = new Date(Date.UTC(2027, 5, 21));

async function main(): Promise<void> {
  if ((await prisma.session.count()) > 0) {
    console.log('✅ a session already exists: session data not seeded, nothing overwritten');
  } else {
    await seedSession();
  }

  if ((await prisma.user.count()) > 0) {
    console.log('✅ accounts already exist: demo accounts not seeded');
  } else {
    await seedAccounts();
  }
}

/** The password of the three demo accounts, documented in README.md. */
const DEMO_PASSWORD = 'soutenance2027';

/**
 * One account per role: the admin, and a teacher and a student who already
 * have a defense placed, so that their schedule is not empty.
 */
async function seedAccounts(): Promise<void> {
  const passwordHash = hashPassword(DEMO_PASSWORD);
  await prisma.user.create({ data: { email: 'admin@castelmont.fr', passwordHash, role: 'ADMIN' } });

  const first = await prisma.defense.findFirst({
    orderBy: [{ slot: { dayIndex: 'asc' } }, { slot: { indexInDay: 'asc' } }, { room: { name: 'asc' } }],
    include: { student: { include: { academicTutor: true } } },
  });
  const student = first?.student ?? (await prisma.student.findFirst({ include: { academicTutor: true }, orderBy: { id: 'asc' } }));
  if (!student) return;
  const teacher = student.academicTutor;

  await prisma.user.create({
    data: { email: teacher.email, passwordHash, role: 'ENSEIGNANT', teacher: { connect: { id: teacher.id } } },
  });
  await prisma.user.create({
    data: { email: student.email, passwordHash, role: 'ELEVE', student: { connect: { id: student.id } } },
  });

  console.log(`✅ demo accounts (password ${DEMO_PASSWORD}): admin@castelmont.fr, ${teacher.email}, ${student.email}`);
}

async function seedSession(): Promise<void> {
  // The session, its rooms and its slots
  const session = await prisma.session.create({ data: { name: SESSION_NAME, startDate: MONDAY } });
  const rooms: Room[] = [];
  for (const name of ['A', 'B', 'C', 'D']) {
    rooms.push(
      await prisma.room.create({
        data: {
          name: `Salle ${name}`,
          videoLink: `https://visio.castelmont.fr/salle-${name.toLowerCase()}`,
          closedThursdayAfternoon: name === 'C' || name === 'D',
          sessionId: session.id,
        },
      }),
    );
  }
  await prisma.slot.createMany({ data: generateSlots(MONDAY).map((slot) => ({ ...slot, sessionId: session.id })) });
  const slots = await prisma.slot.findMany({ where: { sessionId: session.id }, orderBy: [{ dayIndex: 'asc' }, { indexInDay: 'asc' }] });

  // 35 teachers
  const teachers: Teacher[] = [];
  for (let i = 0; i < 35; i++) {
    const person = newPerson();
    teachers.push(
      await prisma.teacher.create({
        data: { ...person, email: `${slug(person.firstName, person.lastName)}@castelmont.fr` },
      }),
    );
  }

  // 65 companies: 10 × 3 students, 15 × 2, 40 × 1. Each gets its tutors.
  const companyNames = shuffle(COMPANY_PREFIXES.flatMap((prefix) => COMPANY_SUFFIXES.map((suffix) => `${prefix} ${suffix}`))).slice(0, 65);
  const sizes = [...Array<number>(10).fill(3), ...Array<number>(15).fill(2), ...Array<number>(40).fill(1)];

  // Who is academic tutor of how many: 20 × 3 + 5 × 4 + 10 × 2 = 100, shuffled over the students.
  const tutorCounts = shuffle([...Array<number>(20).fill(3), ...Array<number>(5).fill(4), ...Array<number>(10).fill(2)]);
  const academicTutors = shuffle(teachers.flatMap((teacher, i) => Array<Teacher>(tutorCounts[i]).fill(teacher)));

  const students: Student[] = [];
  for (const [c, name] of companyNames.entries()) {
    const company = await prisma.company.create({ data: { name } });
    const size = sizes[c];
    const domain = slug(name).replace(/\./g, '-');

    // Most multi-student companies share one tutor; a few (every 3rd) have one tutor per student.
    const tutorCount = size > 1 && c % 3 === 0 ? size : 1;
    const tutors = [];
    for (let t = 0; t < tutorCount; t++) {
      const person = newPerson();
      tutors.push(
        await prisma.companyTutor.create({
          data: { ...person, email: `${slug(person.firstName, person.lastName)}@${domain}.fr`, companyId: company.id },
        }),
      );
    }

    for (let s = 0; s < size; s++) {
      const person = newPerson();
      students.push(
        await prisma.student.create({
          data: {
            ...person,
            email: `${slug(person.firstName, person.lastName)}@etu.castelmont.fr`,
            companyId: company.id,
            companyTutorId: tutors[s % tutors.length].id,
            academicTutorId: academicTutors[students.length].id,
          },
        }),
      );
    }
  }

  // 25 teachers have answered, some with no unavailability at all; 10 have not.
  const unavailable = new Set<string>();
  for (const [i, teacher] of teachers.entries()) {
    if (i >= 25) continue;
    const count = i % 4; // 0, 1, 2 or 3 half-days
    const chosen = shuffle(slots.filter((slot) => slot.indexInDay === 0 || slot.indexInDay === 6)).slice(0, count);
    for (const slot of chosen) {
      await prisma.teacherUnavailability.create({ data: { teacherId: teacher.id, date: slot.date, halfDay: slot.halfDay } });
      unavailable.add(`${teacher.id}|${slot.dayIndex}|${slot.halfDay}`);
    }
    await prisma.teacher.update({ where: { id: teacher.id }, data: { availabilitySubmittedAt: new Date(Date.UTC(2027, 4, 10 + i)) } });
  }

  // 10 valid defenses on Monday morning, slots 8:30 to 9:50, rooms A to D.
  // The checks here are the client's rules, written inline: the seed must not
  // produce a conflict the app would then report.
  const placed: { slotId: number; teacherIds: number[]; companyTutorId: number }[] = [];
  const candidates = shuffle(students);
  const targets = slots.filter((slot) => slot.dayIndex === 0 && slot.indexInDay < 3).flatMap((slot) => rooms.map((room) => ({ slot, room })));
  let defenses = 0;

  for (const { slot, room } of targets) {
    if (defenses === 10) break;
    const isFree = (teacherId: number) =>
      !unavailable.has(`${teacherId}|${slot.dayIndex}|${slot.halfDay}`) &&
      !placed.some((defense) => defense.slotId === slot.id && defense.teacherIds.includes(teacherId));

    for (let k = 0; k < candidates.length; k++) {
      const student = candidates[k];
      if (!isFree(student.academicTutorId)) continue;
      if (placed.some((defense) => defense.slotId === slot.id && defense.companyTutorId === student.companyTutorId)) continue;

      // Same-company rule: not the academic tutor of another student of this company.
      const forbidden = new Set(students.filter((other) => other.companyId === student.companyId).map((other) => other.academicTutorId));
      const second = shuffle(teachers).find((teacher) => !forbidden.has(teacher.id) && isFree(teacher.id));
      if (!second) continue;

      await prisma.defense.create({ data: { studentId: student.id, slotId: slot.id, roomId: room.id, secondTeacherId: second.id } });
      placed.push({ slotId: slot.id, teacherIds: [student.academicTutorId, second.id], companyTutorId: student.companyTutorId });
      candidates.splice(k, 1);
      defenses++;
      break;
    }
  }

  console.log(
    `✅ 1 session, ${rooms.length} rooms, ${slots.length} slots, ${teachers.length} teachers, ` +
      `${companyNames.length} companies, ${students.length} students, ${unavailable.size} unavailable half-days, ${defenses} defenses`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
