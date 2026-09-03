/**
 * Migrations must be re-runnable.
 *
 * supabase/setup.sql is applied by hand and often more than once, so every
 * statement has to tolerate the objects already existing. PostgreSQL has no
 * "create policy if not exists", so each `create policy X` must be preceded by
 * `drop policy if exists X` — dropping only the *old* name when renaming a
 * policy leaves a migration that works once and fails on every re-run.
 *
 *   node scripts/check-migrations.mjs
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'supabase/migrations'
const problems = []

for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = readFileSync(join(dir, file), 'utf8')

  const dropped = new Set(
    [...sql.matchAll(/drop\s+policy\s+if\s+exists\s+(\w+)\s+on/gi)].map((m) => m[1].toLowerCase()),
  )
  for (const m of sql.matchAll(/create\s+policy\s+(\w+)\s+on\s+([\w.]+)/gi)) {
    if (!dropped.has(m[1].toLowerCase())) {
      problems.push(`${file}: policy "${m[1]}" on ${m[2]} — add "drop policy if exists ${m[1]} on ${m[2]};" first`)
    }
  }

  // Views must be dropped before being created — including with "or replace",
  // which cannot change a view's column list, so any later migration that adds
  // a column breaks the earlier one on a re-run.
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+([\w.]+)/gi)) {
    if (!new RegExp(`drop\\s+view\\s+if\\s+exists\\s+${m[1].replace('.', '\\.')}`, 'i').test(sql)) {
      problems.push(`${file}: view "${m[1]}" — add "drop view if exists ${m[1]};" before creating it`)
    }
  }

  // Triggers cannot be replaced in place.
  const droppedTriggers = new Set(
    [...sql.matchAll(/drop\s+trigger\s+if\s+exists\s+(\w+)\s+on/gi)].map((m) => m[1].toLowerCase()),
  )
  for (const m of sql.matchAll(/create\s+trigger\s+(\w+)/gi)) {
    if (!droppedTriggers.has(m[1].toLowerCase())) {
      problems.push(`${file}: trigger "${m[1]}" — add "drop trigger if exists ${m[1]} on <table>;" first`)
    }
  }
}

if (problems.length) {
  console.error('\nMigrations are not re-runnable:\n')
  for (const p of problems) console.error('  ' + p)
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}\n`)
  process.exit(1)
}
console.log(`Migrations are re-runnable (${readdirSync(dir).filter((f) => f.endsWith('.sql')).length} files checked)`)
