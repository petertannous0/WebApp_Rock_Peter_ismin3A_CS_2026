import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { toDay } from '../common/days.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NoProfile, type CompanyTutorSchedule, type Jury, type StudentSchedule, type TeacherDefense, type When } from './schedule.js';

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;

const include = {
  slot: true,
  room: true,
  secondTeacher: true,
  student: { include: { company: true, companyTutor: true, academicTutor: true } },
} as const;

type DefenseRow = Prisma.DefenseGetPayload<{ include: typeof include }>;

/** In time order: the day, then the slot of the day. */
const chronological = [{ slot: { dayIndex: 'asc' } }, { slot: { indexInDay: 'asc' } }] as const;

function when(row: DefenseRow): When {
  return {
    day: toDay(row.slot.date),
    startMinutes: row.slot.startMinutes,
    halfDay: row.slot.halfDay,
    roomName: row.room.name,
    videoLink: row.room.videoLink,
  };
}

function jury(row: DefenseRow): Jury {
  return {
    academicTutor: fullName(row.student.academicTutor),
    secondTeacher: fullName(row.secondTeacher),
    companyTutor: fullName(row.student.companyTutor),
  };
}

/**
 * F3: each person sees their own schedule, as soon as a defense is placed
 * (decision P6-d). Read only. No conflicts here: those are the admin's business.
 */
@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /** The defenses where the logged-in teacher sits, either role, day by day. */
  async forTeacher(userId: number): Promise<TeacherDefense[]> {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new NoProfile(userId);

    const rows = await this.prisma.defense.findMany({
      where: { OR: [{ secondTeacherId: teacher.id }, { student: { academicTutorId: teacher.id } }] },
      include,
      orderBy: [...chronological],
    });
    return rows.map((row) => ({
      id: row.id,
      ...when(row),
      role: row.student.academicTutorId === teacher.id ? 'ACADEMIC_TUTOR' : 'SECOND_TEACHER',
      student: { name: fullName(row.student), companyName: row.student.company.name },
      jury: jury(row),
    }));
  }

  /** The logged-in student's defense: slot, room, jury. Names only, no emails (decision P6-b). */
  async forStudent(userId: number): Promise<StudentSchedule> {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NoProfile(userId);

    const row = await this.prisma.defense.findUnique({ where: { studentId: student.id }, include });
    return { studentName: fullName(student), defense: row ? { ...when(row), jury: jury(row) } : null };
  }

  /** Every company tutor, with their defenses: the admin copies them into an email. */
  async forCompanyTutors(): Promise<CompanyTutorSchedule[]> {
    const [tutors, rows] = await Promise.all([
      this.prisma.companyTutor.findMany({ include: { company: true }, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] }),
      this.prisma.defense.findMany({ include, orderBy: [...chronological] }),
    ]);
    return tutors.map((tutor) => ({
      id: tutor.id,
      name: fullName(tutor),
      email: tutor.email,
      companyName: tutor.company.name,
      defenses: rows
        .filter((row) => row.student.companyTutorId === tutor.id)
        .map((row) => ({ ...when(row), studentName: fullName(row.student) })),
    }));
  }
}
