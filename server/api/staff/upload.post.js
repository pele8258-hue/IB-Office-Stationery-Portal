/**
 * POST /api/staff/upload
 * Body: { rows: [{ name, email, password, phone, position, branch_code, department, role_code }] }
 * Bulk-creates staff accounts from a parsed CSV upload
 */
import bcrypt from 'bcryptjs'
import oracledb from 'oracledb'
import { query, execute } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) ?? {}
  const rows = body.rows

  if (!Array.isArray(rows) || !rows.length) {
    throw createError({
      statusCode: 422,
      data: { success: false, message: 'No rows provided' },
    })
  }

  if (rows.length > 200) {
    throw createError({
      statusCode: 422,
      data: { success: false, message: 'Maximum 200 rows per upload' },
    })
  }

  // Load lookup tables once
  const [branches, depts, roles] = await Promise.all([
    query(`SELECT id, code, name FROM branches`),
    query(`SELECT id, name FROM departments`),
    query(`SELECT id, code, name FROM roles`),
  ])

  const branchByCode = Object.fromEntries(branches.map(b => [String(b.CODE).trim().toLowerCase(), b.ID]))
  const deptByName   = Object.fromEntries(depts.map(d => [String(d.NAME).trim().toLowerCase(), d.ID]))
  const roleByCode   = Object.fromEntries(roles.map(r => [String(r.CODE).trim().toLowerCase(), r.ID]))

  const results = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2 // row 1 = header
    const errors = []

    const name     = row.name?.trim()
    const email    = row.email?.trim()?.toLowerCase()
    const password = row.password?.trim()
    const phone    = row.phone?.trim() || null
    const position = row.position?.trim() || null

    if (!name)     errors.push('Name is required')
    if (!email)    errors.push('Email is required')
    if (!password) errors.push('Password is required')
    else if (password.length < 6) errors.push('Password must be at least 6 characters')

    const branchId = branchByCode[String(row.branch_code ?? '').trim().toLowerCase()]
    const deptId   = deptByName[String(row.department ?? '').trim().toLowerCase()]
    const roleId   = roleByCode[String(row.role_code ?? '').trim().toLowerCase()]

    if (!branchId) errors.push(`Branch code "${row.branch_code}" not found`)
    if (!deptId)   errors.push(`Department "${row.department}" not found`)
    if (!roleId)   errors.push(`Role code "${row.role_code}" not found`)

    if (errors.length) {
      results.push({ row: rowNum, name, email, status: 'failed', errors })
      continue
    }

    // Duplicate email check
    const dup = await query(
      `SELECT id FROM staff WHERE LOWER(email) = :email`,
      { email }
    )
    if (dup.length) {
      results.push({ row: rowNum, name, email, status: 'failed', errors: ['Email already in use'] })
      continue
    }

    try {
      const hashed = await bcrypt.hash(password, 12)
      await execute(
        `INSERT INTO staff
           (name, email, password, phone, position, branch_id, department_id, role_id, status, created_by)
         VALUES
           (:name, :email, :password, :phone, :position, :branch_id, :department_id, :role_id, :status, :created_by)`,
        {
          name, email, password: hashed, phone, position,
          branch_id: branchId, department_id: deptId, role_id: roleId,
          status: 'N',
          created_by: event.context.staff?.id || null,
        }
      )
      results.push({ row: rowNum, name, email, status: 'success' })
    } catch (e) {
      results.push({ row: rowNum, name, email, status: 'failed', errors: ['Database error: ' + (e.message ?? 'unknown')] })
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length
  const failed    = results.filter(r => r.status === 'failed').length

  return {
    success: true,
    code: 200,
    message: `Upload complete: ${succeeded} created, ${failed} failed`,
    data: { results, summary: { total: rows.length, succeeded, failed } },
    timestamp: new Date().toISOString(),
  }
})
