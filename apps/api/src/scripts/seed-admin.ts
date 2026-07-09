/**
 * Seed script: створює перший табір і адміна.
 * Запуск: npx tsx src/scripts/seed-admin.ts
 */
import { config } from 'dotenv'
config()

import { db, sql } from '../db/client.js'
import { camps, users } from '../db/schema/index.js'
import { hashPassword } from '../lib/password.js'

const CAMP_NAME = 'Табір Надія 2026'
const ADMIN_EMAIL = 'admin@camp.com'
const ADMIN_PASSWORD = 'Admin1234!'
const ADMIN_FIRST_NAME = 'Адміністратор'
const ADMIN_LAST_NAME = 'Системи'

async function seed() {
  console.log('🌱 Запуск seed...')

  // 1. Створюємо табір
  const [existingCamp] = await db
    .select()
    .from(camps)
    .limit(1)

  let campId: string

  if (existingCamp) {
    campId = existingCamp.id
    console.log(`✅ Табір вже існує: "${existingCamp.name}" (${campId})`)
  } else {
    const [camp] = await db
      .insert(camps)
      .values({
        name: CAMP_NAME,
        startDate: new Date('2026-07-01'),
        status: 'active',
      })
      .returning()
    campId = camp.id
    console.log(`✅ Табір створено: "${camp.name}" (${campId})`)
  }

  // 2. Перевіряємо чи адмін вже є
  const { eq } = await import('drizzle-orm')
  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1)

  if (existingAdmin) {
    console.log(`⚠️  Адмін вже існує: ${ADMIN_EMAIL}`)
  } else {
    const passwordHash = await hashPassword(ADMIN_PASSWORD)
    const [admin] = await db
      .insert(users)
      .values({
        campId,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'Administrator',
      })
      .returning({ id: users.id, email: users.email })

    console.log(`✅ Адмін створений: ${admin.email} (${admin.id})`)
  }

  console.log('\n🔑 Дані для входу:')
  console.log(`   Email:    ${ADMIN_EMAIL}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
  console.log(`\n   POST http://localhost:3000/auth/login`)

  await sql.end()
}

seed().catch((err) => {
  console.error('❌ Помилка seed:', err)
  process.exit(1)
})
