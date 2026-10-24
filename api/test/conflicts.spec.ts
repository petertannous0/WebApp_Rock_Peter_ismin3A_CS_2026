import {
  canBeSaved,
  checkPlacement,
  companyTutorOtherDays,
  MAX_DEFENSES_PER_TEACHER_PER_DAY,
  SEVERITY,
  UnknownId,
  type PlacedDefense,
  type PlacementState,
  type ProposedDefense,
  type Rule,
  type StudentInfo,
  type Violation,
} from '../src/defenses/conflicts.js';
import { generateSlots } from '../src/session/slots.js';

/**
 * One block per rule of the client, with its edge cases. The state is built
 * by hand: 4 teachers, 2 company tutors, 4 rooms (C and D closed on Thursday
 * afternoon), the 60 slots of the week of 21 June 2027.
 */

const MONDAY = 0;
const WEDNESDAY = 2;
const THURSDAY = 3;

// Slot ids: 1…60, 12 per day, morning 0–5 then afternoon 6–11.
const slotId = (dayIndex: number, indexInDay: number) => dayIndex * 12 + indexInDay + 1;
const AT_8_30 = 0;
const AT_9_10 = 1;
const AT_9_50 = 2;
const AT_11_50 = 5;
const AT_13_30 = 6;
const AT_16_50 = 11;

const [DURAND, ROUX, BLANC, PETIT] = [1, 2, 3, 4];
const [JEAN, INES] = [10, 11];
const [ROOM_A, ROOM_B, ROOM_C] = [1, 2, 3];
const [LEA, HUGO, ZOE, TOM] = [20, 21, 22, 23];

function student(id: number, name: string, fields: Partial<StudentInfo> = {}): StudentInfo {
  return { id, name, companyId: 300 + id, companyName: `Entreprise ${id}`, companyTutorId: 100 + id, academicTutorId: PETIT, ...fields };
}

/** The base state. Léa and Hugo: same company, same company tutor, different academic tutors. */
function baseState(): PlacementState {
  return {
    slots: generateSlots(new Date('2027-06-21T00:00:00.000Z')).map((slot, i) => ({
      id: i + 1,
      day: slot.date.toISOString().slice(0, 10),
      dayIndex: slot.dayIndex,
      startMinutes: slot.startMinutes,
      halfDay: slot.halfDay,
    })),
    rooms: [
      { id: ROOM_A, name: 'Salle A', closedThursdayAfternoon: false },
      { id: ROOM_B, name: 'Salle B', closedThursdayAfternoon: false },
      { id: ROOM_C, name: 'Salle C', closedThursdayAfternoon: true },
      { id: 4, name: 'Salle D', closedThursdayAfternoon: true },
    ],
    teachers: [
      { id: DURAND, name: 'Paul Durand' },
      { id: ROUX, name: 'Anna Roux' },
      { id: BLANC, name: 'Tom Blanc' },
      { id: PETIT, name: 'Zoé Petit' },
    ],
    companyTutors: [
      { id: JEAN, name: 'Jean Roux' },
      { id: INES, name: 'Inès Faure' },
      ...Array.from({ length: 50 }, (_, i) => ({ id: 130 + i, name: `Tuteur ${30 + i}` })),
    ],
    students: [
      student(LEA, 'Léa Martin', { companyId: 1, companyName: 'Provence Microsystèmes', companyTutorId: JEAN, academicTutorId: DURAND }),
      student(HUGO, 'Hugo Petit', { companyId: 1, companyName: 'Provence Microsystèmes', companyTutorId: JEAN, academicTutorId: ROUX }),
      student(ZOE, 'Zoé Blanc', { companyId: 2, companyName: 'Azur Data', companyTutorId: INES, academicTutorId: BLANC }),
      student(TOM, 'Tom Girard', { companyId: 2, companyName: 'Azur Data', companyTutorId: INES, academicTutorId: PETIT }),
      // 30…79: one student per company, academic tutor Petit, for the counting rules
      ...Array.from({ length: 50 }, (_, i) => student(30 + i, `Élève ${30 + i}`)),
    ],
    unavailabilities: [],
    defenses: [],
  };
}

let nextDefenseId = 1000;
function placed(fields: Omit<PlacedDefense, 'id'> & { id?: number }): PlacedDefense {
  return { id: nextDefenseId++, ...fields };
}

const lea: ProposedDefense = { studentId: LEA, secondTeacherId: BLANC, slotId: slotId(MONDAY, AT_9_10), roomId: ROOM_A };

const rules = (violations: Violation[]): Rule[] => violations.map((v) => v.rule);

describe('checkPlacement', () => {
  let state: PlacementState;
  beforeEach(() => {
    state = baseState();
  });

  it('finds nothing wrong with a valid placement', () => {
    expect(checkPlacement(lea, state)).toEqual([]);
  });

  describe('rule 1: a teacher already in another defense at that slot', () => {
    it("catches the student's academic tutor, busy as second teacher elsewhere", () => {
      // Tom's jury: Petit (his academic tutor) and Durand, at Léa's slot.
      state.defenses.push(placed({ studentId: TOM, secondTeacherId: DURAND, slotId: lea.slotId, roomId: ROOM_B }));

      expect(checkPlacement(lea, state)).toEqual([
        {
          rule: 'TEACHER_BUSY',
          teacher: { id: DURAND, name: 'Paul Durand' },
          other: { studentName: 'Tom Girard', day: '2027-06-21', startMinutes: 550, roomName: 'Salle B' },
        },
      ]);
    });

    it('catches the second teacher, busy as academic tutor elsewhere', () => {
      // Zoé's academic tutor is Blanc, Léa's second teacher.
      state.defenses.push(placed({ studentId: ZOE, secondTeacherId: ROUX, slotId: lea.slotId, roomId: ROOM_B }));

      expect(rules(checkPlacement(lea, state))).toEqual(['TEACHER_BUSY']);
      expect(checkPlacement(lea, state)[0]).toMatchObject({ teacher: { id: BLANC } });
    });

    it('accepts back-to-back slots: 9:10 then 9:50, no break between them', () => {
      state.defenses.push(placed({ studentId: ZOE, secondTeacherId: DURAND, slotId: slotId(MONDAY, AT_9_50), roomId: ROOM_B }));
      state.defenses.push(placed({ studentId: TOM, secondTeacherId: DURAND, slotId: slotId(MONDAY, AT_8_30), roomId: ROOM_B }));

      expect(checkPlacement(lea, state)).toEqual([]);
    });

    it('accepts the same time on another day', () => {
      state.defenses.push(placed({ studentId: ZOE, secondTeacherId: DURAND, slotId: slotId(WEDNESDAY, AT_9_10), roomId: ROOM_B }));

      expect(checkPlacement(lea, state)).toEqual([]);
    });

    it('reports each busy teacher: both, when both are busy', () => {
      // Zoé's jury at 9:10: Blanc (her academic tutor) and Durand: both are on Léa's jury too.
      state.defenses.push(placed({ studentId: ZOE, secondTeacherId: DURAND, slotId: lea.slotId, roomId: ROOM_B }));

      const busy = checkPlacement(lea, state).filter((v) => v.rule === 'TEACHER_BUSY');
      expect(busy.map((v) => v.rule === 'TEACHER_BUSY' && v.teacher.id)).toEqual([DURAND, BLANC]);
    });
  });

  describe('rule 2: a teacher unavailable that half-day', () => {
    it('catches the academic tutor, unavailable that morning', () => {
      state.unavailabilities.push({ teacherId: DURAND, day: '2027-06-21', halfDay: 'MORNING' });

      expect(checkPlacement(lea, state)).toEqual([
        { rule: 'TEACHER_UNAVAILABLE', teacher: { id: DURAND, name: 'Paul Durand' }, day: '2027-06-21', halfDay: 'MORNING' },
      ]);
    });

    it('catches the second teacher too', () => {
      state.unavailabilities.push({ teacherId: BLANC, day: '2027-06-21', halfDay: 'MORNING' });

      expect(checkPlacement(lea, state)).toMatchObject([{ rule: 'TEACHER_UNAVAILABLE', teacher: { id: BLANC } }]);
    });

    it('counts 11:50, the last slot of the morning, as morning', () => {
      state.unavailabilities.push({ teacherId: DURAND, day: '2027-06-21', halfDay: 'MORNING' });

      expect(rules(checkPlacement({ ...lea, slotId: slotId(MONDAY, AT_11_50) }, state))).toEqual(['TEACHER_UNAVAILABLE']);
    });

    it('counts 13:30, the first slot of the afternoon, as afternoon: free when only the morning is blocked', () => {
      state.unavailabilities.push({ teacherId: DURAND, day: '2027-06-21', halfDay: 'MORNING' });

      expect(checkPlacement({ ...lea, slotId: slotId(MONDAY, AT_13_30) }, state)).toEqual([]);
    });

    it('ignores an unavailability on another day', () => {
      state.unavailabilities.push({ teacherId: DURAND, day: '2027-06-22', halfDay: 'MORNING' });

      expect(checkPlacement(lea, state)).toEqual([]);
    });
  });

  describe('rule 3: the room already used at that slot', () => {
    it('catches a room already taken', () => {
      state.defenses.push(placed({ studentId: 30, secondTeacherId: ROUX, slotId: lea.slotId, roomId: ROOM_A }));

      expect(checkPlacement(lea, state)).toEqual([
        { rule: 'ROOM_TAKEN', roomName: 'Salle A', other: { studentName: 'Élève 30', day: '2027-06-21', startMinutes: 550, roomName: 'Salle A' } },
      ]);
    });

    it('accepts another room at the same slot', () => {
      state.defenses.push(placed({ studentId: 30, secondTeacherId: ROUX, slotId: lea.slotId, roomId: ROOM_B }));

      expect(checkPlacement(lea, state)).toEqual([]);
    });

    it('accepts the same room at the next slot', () => {
      state.defenses.push(placed({ studentId: 30, secondTeacherId: ROUX, slotId: slotId(MONDAY, AT_9_50), roomId: ROOM_A }));

      expect(checkPlacement(lea, state)).toEqual([]);
    });
  });

  describe('rule 4: the room unavailable, Thursday afternoon', () => {
    it('catches room C on Thursday at 13:30', () => {
      expect(checkPlacement({ ...lea, slotId: slotId(THURSDAY, AT_13_30), roomId: ROOM_C }, state)).toEqual([
        { rule: 'ROOM_CLOSED', roomName: 'Salle C', day: '2027-06-24' },
      ]);
    });

    it('catches room C on Thursday at 16:50, the last slot', () => {
      expect(rules(checkPlacement({ ...lea, slotId: slotId(THURSDAY, AT_16_50), roomId: ROOM_C }, state))).toEqual(['ROOM_CLOSED']);
    });

    it('accepts room C on Thursday morning, even at 11:50', () => {
      expect(checkPlacement({ ...lea, slotId: slotId(THURSDAY, AT_11_50), roomId: ROOM_C }, state)).toEqual([]);
    });

    it('accepts room C on Wednesday afternoon', () => {
      expect(checkPlacement({ ...lea, slotId: slotId(WEDNESDAY, AT_13_30), roomId: ROOM_C }, state)).toEqual([]);
    });

    it('accepts room A on Thursday afternoon: it is not closed', () => {
      expect(checkPlacement({ ...lea, slotId: slotId(THURSDAY, AT_13_30), roomId: ROOM_A }, state)).toEqual([]);
    });
  });

  describe('rule 5: a teacher over 6 defenses that day', () => {
    function blancAlreadyHas(count: number, dayIndex = MONDAY) {
      const freeSlots = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // not 1: Léa's slot
      for (let i = 0; i < count; i++) {
        state.defenses.push(placed({ studentId: 30 + i, secondTeacherId: BLANC, slotId: slotId(dayIndex, freeSlots[i]), roomId: ROOM_B }));
      }
    }

    it('is 6, the client’s number', () => {
      expect(MAX_DEFENSES_PER_TEACHER_PER_DAY).toBe(6);
    });

    it('accepts the 6th defense of the day: exactly 6 is allowed', () => {
      blancAlreadyHas(5);

      expect(checkPlacement(lea, state)).toEqual([]);
    });

    it('catches the 7th defense of the day', () => {
      blancAlreadyHas(6);

      expect(checkPlacement(lea, state)).toEqual([
        { rule: 'TEACHER_OVERLOADED', teacher: { id: BLANC, name: 'Tom Blanc' }, day: '2027-06-21', count: 7 },
      ]);
    });

    it('counts the defenses where the teacher is academic tutor too', () => {
      // Zoé's academic tutor is Blanc: 3 as second teacher + 3 as academic tutor = 6 already.
      blancAlreadyHas(3);
      state.students.push(
        student(90, 'Élève 90', { academicTutorId: BLANC }),
        student(91, 'Élève 91', { academicTutorId: BLANC }),
      );
      state.companyTutors.push({ id: 190, name: 'T90' }, { id: 191, name: 'T91' });
      state.defenses.push(
        placed({ studentId: ZOE, secondTeacherId: ROUX, slotId: slotId(MONDAY, 6), roomId: ROOM_A }),
        placed({ studentId: 90, secondTeacherId: ROUX, slotId: slotId(MONDAY, 7), roomId: ROOM_A }),
        placed({ studentId: 91, secondTeacherId: ROUX, slotId: slotId(MONDAY, 8), roomId: ROOM_A }),
      );

      expect(checkPlacement(lea, state)).toMatchObject([{ rule: 'TEACHER_OVERLOADED', teacher: { id: BLANC }, count: 7 }]);
    });

    it('does not count the defenses of other days', () => {
      blancAlreadyHas(6, WEDNESDAY);

      expect(checkPlacement(lea, state)).toEqual([]);
    });

    it('does not count the defense being moved, inside the same day', () => {
      blancAlreadyHas(6);
      const moved = state.defenses[0];

      // Moving one of Blanc's 6 Monday defenses to Léa's slot: still 6 that day.
      const proposal = { studentId: moved.studentId, secondTeacherId: BLANC, slotId: lea.slotId, roomId: ROOM_A, defenseId: moved.id };
      expect(checkPlacement(proposal, state)).toEqual([]);
    });
  });

  describe('rule 6: the company tutor already in another defense at that slot', () => {
    it("catches Léa's company tutor, already on Hugo's jury at 9:10", () => {
      state.defenses.push(placed({ studentId: HUGO, secondTeacherId: PETIT, slotId: lea.slotId, roomId: ROOM_B }));

      expect(checkPlacement(lea, state)).toEqual([
        {
          rule: 'COMPANY_TUTOR_BUSY',
          companyTutor: { id: JEAN, name: 'Jean Roux' },
          other: { studentName: 'Hugo Petit', day: '2027-06-21', startMinutes: 550, roomName: 'Salle B' },
        },
      ]);
    });

    it('accepts the same tutor at the next slot: grouping them is even nice', () => {
      state.defenses.push(placed({ studentId: HUGO, secondTeacherId: PETIT, slotId: slotId(MONDAY, AT_9_50), roomId: ROOM_B }));

      expect(checkPlacement(lea, state)).toEqual([]);
    });
  });

  describe('rule 7: the same-company rule', () => {
    it("refuses Hugo's academic tutor as Léa's second teacher: same company", () => {
      expect(checkPlacement({ ...lea, secondTeacherId: ROUX }, state)).toEqual([
        {
          rule: 'SAME_COMPANY',
          secondTeacher: { id: ROUX, name: 'Anna Roux' },
          otherStudentName: 'Hugo Petit',
          companyName: 'Provence Microsystèmes',
        },
      ]);
    });

    it("refuses it the other way round: Léa's academic tutor as Hugo's second teacher", () => {
      const hugo = { studentId: HUGO, secondTeacherId: DURAND, slotId: lea.slotId, roomId: ROOM_A };

      expect(checkPlacement(hugo, state)).toMatchObject([{ rule: 'SAME_COMPANY', otherStudentName: 'Léa Martin' }]);
    });

    it('applies even when the other student is not placed yet: it depends on the students, not on the grid', () => {
      expect(state.defenses).toHaveLength(0);
      expect(rules(checkPlacement({ ...lea, secondTeacherId: ROUX }, state))).toEqual(['SAME_COMPANY']);
    });

    it('accepts the academic tutor of a student of another company', () => {
      // Zoé (Azur Data) has Blanc as academic tutor; Léa is at Provence.
      expect(checkPlacement({ ...lea, secondTeacherId: BLANC }, state)).toEqual([]);
    });
  });

  describe("rule 8: the second teacher is the student's academic tutor", () => {
    it('refuses Durand as second teacher of his own student Léa', () => {
      expect(checkPlacement({ ...lea, secondTeacherId: DURAND }, state)).toEqual([
        { rule: 'SECOND_TEACHER_IS_ACADEMIC_TUTOR', teacher: { id: DURAND, name: 'Paul Durand' }, studentName: 'Léa Martin' },
      ]);
    });

    it('does not report the same teacher twice for the other rules', () => {
      state.unavailabilities.push({ teacherId: DURAND, day: '2027-06-21', halfDay: 'MORNING' });

      expect(rules(checkPlacement({ ...lea, secondTeacherId: DURAND }, state))).toEqual([
        'TEACHER_UNAVAILABLE',
        'SECOND_TEACHER_IS_ACADEMIC_TUTOR',
      ]);
    });
  });

  describe('rule 9: the student already placed', () => {
    it('refuses a second defense for Léa', () => {
      state.defenses.push(placed({ studentId: LEA, secondTeacherId: BLANC, slotId: slotId(WEDNESDAY, AT_8_30), roomId: ROOM_B }));

      expect(checkPlacement(lea, state)).toEqual([
        { rule: 'STUDENT_ALREADY_PLACED', studentName: 'Léa Martin', other: { studentName: 'Léa Martin', day: '2027-06-23', startMinutes: 510, roomName: 'Salle B' } },
      ]);
    });

    it("accepts moving Léa's own defense: it is left out of the state", () => {
      const own = placed({ studentId: LEA, secondTeacherId: BLANC, slotId: slotId(WEDNESDAY, AT_8_30), roomId: ROOM_B });
      state.defenses.push(own);

      expect(checkPlacement({ ...lea, defenseId: own.id }, state)).toEqual([]);
    });

    it('accepts moving a defense to its own slot and room: no conflict with itself', () => {
      const own = placed({ ...lea });
      state.defenses.push(own);

      expect(checkPlacement({ ...lea, defenseId: own.id }, state)).toEqual([]);
    });
  });

  it('returns every broken rule at once, not only the first one', () => {
    state.unavailabilities.push({ teacherId: DURAND, day: '2027-06-24', halfDay: 'AFTERNOON' });
    state.defenses.push(placed({ studentId: HUGO, secondTeacherId: PETIT, slotId: slotId(THURSDAY, AT_13_30), roomId: ROOM_A }));

    const proposal = { studentId: LEA, secondTeacherId: ROUX, slotId: slotId(THURSDAY, AT_13_30), roomId: ROOM_C };
    expect(rules(checkPlacement(proposal, state))).toEqual([
      'TEACHER_BUSY', // Roux is Hugo's academic tutor, at that slot
      'TEACHER_UNAVAILABLE', // Durand, Thursday afternoon
      'ROOM_CLOSED', // room C, Thursday afternoon
      'COMPANY_TUTOR_BUSY', // Jean Roux, on Hugo's jury
      'SAME_COMPANY', // Roux tutors Hugo, same company as Léa
    ]);
  });

  it('throws UnknownId for an id the state does not hold', () => {
    expect(() => checkPlacement({ ...lea, studentId: 999 }, state)).toThrow(UnknownId);
    expect(() => checkPlacement({ ...lea, slotId: 999 }, state)).toThrow(UnknownId);
  });
});

describe('severity', () => {
  it('lets only rules 2 and 5 be forced', () => {
    const warnings = Object.entries(SEVERITY)
      .filter(([, severity]) => severity === 'WARNING')
      .map(([rule]) => rule);
    expect(warnings.sort()).toEqual(['TEACHER_OVERLOADED', 'TEACHER_UNAVAILABLE']);
  });

  it('can be saved with warnings only, not with a blocking violation', () => {
    const unavailable: Violation = { rule: 'TEACHER_UNAVAILABLE', teacher: { id: 1, name: 'x' }, day: '2027-06-21', halfDay: 'MORNING' };
    const closed: Violation = { rule: 'ROOM_CLOSED', roomName: 'Salle C', day: '2027-06-24' };

    expect(canBeSaved([])).toBe(true);
    expect(canBeSaved([unavailable])).toBe(true);
    expect(canBeSaved([unavailable, closed])).toBe(false);
  });
});

describe('companyTutorOtherDays (a hint, not a rule)', () => {
  it("gives the other days the company tutor already comes, without the proposal's day", () => {
    const state = baseState();
    state.defenses.push(
      placed({ studentId: HUGO, secondTeacherId: PETIT, slotId: slotId(WEDNESDAY, AT_8_30), roomId: ROOM_B }),
      placed({ studentId: ZOE, secondTeacherId: PETIT, slotId: slotId(THURSDAY, AT_8_30), roomId: ROOM_B }),
    );

    expect(companyTutorOtherDays(lea, state)).toEqual(['2027-06-23']);
    expect(companyTutorOtherDays({ ...lea, slotId: slotId(WEDNESDAY, AT_9_10) }, state)).toEqual([]);
  });
});
