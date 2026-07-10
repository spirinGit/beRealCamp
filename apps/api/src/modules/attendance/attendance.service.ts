import { and, asc, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { camps, childAttendance, children, squads } from '../../db/schema/index.js'

function formatDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDay(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function generateCampDays(startDate: Date, endDate: Date) {
  const result: string[] = []
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  while (current <= end) {
    result.push(formatDay(current))
    current.setDate(current.getDate() + 1)
  }

  return result
}

export async function getSquadAttendanceOverview(app: FastifyInstance, squadId: string) {
  const [squadRow] = await app.db
    .select({
      id: squads.id,
      name: squads.name,
      campId: squads.campId,
      campStartDate: camps.startDate,
      campEndDate: camps.endDate,
    })
    .from(squads)
    .innerJoin(camps, eq(camps.id, squads.campId))
    .where(eq(squads.id, squadId))
    .limit(1)

  if (!squadRow) return null

  const campEndDate = squadRow.campEndDate ?? squadRow.campStartDate
  const days = generateCampDays(new Date(squadRow.campStartDate), new Date(campEndDate))

  const squadChildren = await app.db
    .select({
      id: children.id,
      firstName: children.firstName,
      lastName: children.lastName,
      gender: children.gender,
      dateOfBirth: children.dateOfBirth,
      parentName: children.parentName,
      parentPhone: children.parentPhone,
      medicalNotes: children.medicalNotes,
      createdAt: children.createdAt,
    })
    .from(children)
    .where(and(eq(children.campId, squadRow.campId), eq(children.squadId, squadId)))
    .orderBy(asc(children.lastName), asc(children.firstName))

  const childIds = squadChildren.map((child) => child.id)
  const attendanceRows =
    childIds.length === 0
      ? []
      : await app.db
          .select({
            childId: childAttendance.childId,
            day: childAttendance.day,
            isPresent: childAttendance.isPresent,
          })
          .from(childAttendance)
          .where(inArray(childAttendance.childId, childIds))

  const today = formatDay(new Date())
  const attendanceByChild = new Map<string, Record<string, boolean>>()

  for (const row of attendanceRows) {
    const current = attendanceByChild.get(row.childId) ?? {}
    current[row.day] = row.isPresent
    attendanceByChild.set(row.childId, current)
  }

  const applicableTodayChildren = squadChildren.filter((child) => {
    const joinedDay = formatDay(new Date(child.createdAt))
    return days.includes(today) && joinedDay <= today
  })

  const presentToday = applicableTodayChildren.filter((child) => {
    const records = attendanceByChild.get(child.id)
    return records?.[today] === true
  }).length

  return {
    squad: {
      id: squadRow.id,
      name: squadRow.name,
    },
    camp: {
      id: squadRow.campId,
      startDate: squadRow.campStartDate,
      endDate: campEndDate,
    },
    today,
    days,
    totals: {
      totalChildren: squadChildren.length,
      presentToday,
      applicableToday: applicableTodayChildren.length,
    },
    children: squadChildren.map((child) => ({
      ...child,
      attendance: attendanceByChild.get(child.id) ?? {},
    })),
  }
}

export async function markChildAttendance(
  app: FastifyInstance,
  args: {
    childId: string
    day: string
    isPresent: boolean
    markedByUserId: string
  },
) {
  const [child] = await app.db
    .select({
      id: children.id,
      campId: children.campId,
      squadId: children.squadId,
      createdAt: children.createdAt,
    })
    .from(children)
    .where(eq(children.id, args.childId))
    .limit(1)

  if (!child) return { ok: false as const, error: 'Child not found' }

  const [camp] = await app.db.select().from(camps).where(eq(camps.id, child.campId)).limit(1)
  if (!camp) return { ok: false as const, error: 'Camp not found' }

  const joinedDay = formatDay(new Date(child.createdAt))
  const requestedDay = parseDay(args.day)
  const startDay = formatDay(new Date(camp.startDate))
  const endDay = formatDay(new Date(camp.endDate ?? camp.startDate))
  const today = formatDay(new Date())

  if (args.day < startDay || args.day > endDay) {
    return { ok: false as const, error: 'Attendance day is outside camp period' }
  }

  if (args.day < joinedDay) {
    return { ok: false as const, error: 'Child was not in camp yet on this day' }
  }

  if (args.day > today) {
    return { ok: false as const, error: 'You cannot mark future attendance' }
  }

  const [row] = await app.db
    .insert(childAttendance)
    .values({
      campId: child.campId,
      childId: child.id,
      day: args.day,
      isPresent: args.isPresent,
      markedByUserId: args.markedByUserId,
      updatedAt: new Date(),
      note: null,
    })
    .onConflictDoUpdate({
      target: [childAttendance.childId, childAttendance.day],
      set: {
        isPresent: args.isPresent,
        markedByUserId: args.markedByUserId,
        updatedAt: new Date(),
      },
    })
    .returning()

  return { ok: true as const, attendance: row, dayDate: requestedDay }
}
