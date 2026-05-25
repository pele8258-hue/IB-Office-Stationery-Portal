/**
 * POST /api/vehicles/bulk
 * Bulk import vehicles from an Excel file (.xlsx / .xls)
 * Sheet 1 "Vehicles": plate_number*, branch_code*, brand, model, color, year,
 *                     type, ownership_type, engine_number, frame_number,
 *                     parking_lot, parking_floor,
 *                     owner_name, owner_email, owner_phone, owner_dob
 * Sheet 2 "Documents": plate_number*, document_name*, issued_date, expiry_date
 *                      (unlimited rows, linked by plate_number)
 */
import { createRequire } from 'node:module'
const XLSX = createRequire(import.meta.url)('xlsx')
import oracledb from 'oracledb'
import { execute, query } from '../../utils/db.js'

const VALID_TYPES     = ['SEDAN', 'VAN', 'TRUCK', 'SUV', 'PICKUP', 'OTHER']
const VALID_OWNERSHIP = ['OWN', 'LEASE']

function str(v) { return String(v || '').trim() }

function parseDocSheet(wb) {
  // Find "Documents" sheet (case-insensitive)
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'documents')
  if (!sheetName) return {}
  const ws  = wb.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
  // Skip notes row (index 0)
  const rows = raw.filter((_, i) => i !== 0)
  // Group by plate_number → array of doc objects
  const map = {}
  for (const r of rows) {
    const plate = str(r.plate_number).toUpperCase()
    const name  = str(r.document_name)
    if (!plate || !name) continue
    if (!map[plate]) map[plate] = []
    map[plate].push({
      document_name: name,
      issued_date:   str(r.issued_date) || null,
      expiry_date:   str(r.expiry_date) || null,
    })
  }
  return map
}

async function insertDocs(vehicleId, docs, staffId) {
  for (const doc of docs) {
    await execute(
      `INSERT INTO vehicle_documents (vehicle_id, document_name, issued_date, expiry_date, uploaded_by)
       VALUES (:vehicle_id, :document_name,
         CASE WHEN :issued_date IS NOT NULL THEN TO_DATE(:issued_date, 'YYYY-MM-DD') ELSE NULL END,
         CASE WHEN :expiry_date IS NOT NULL THEN TO_DATE(:expiry_date, 'YYYY-MM-DD') ELSE NULL END,
         :uploaded_by)`,
      { vehicle_id: vehicleId, document_name: doc.document_name, issued_date: doc.issued_date, expiry_date: doc.expiry_date, uploaded_by: staffId }
    )
  }
}

export default defineEventHandler(async (event) => {
  const parts    = await readMultipartFormData(event)
  const filePart = parts?.find(p => p.name === 'file' && p.filename)

  if (!filePart) {
    throw createError({ statusCode: 422, data: { success: false, code: 422, message: 'Excel file is required', timestamp: new Date().toISOString() } })
  }

  const ext = filePart.filename.split('.').pop().toLowerCase()
  if (!['xlsx', 'xls'].includes(ext)) {
    throw createError({ statusCode: 422, data: { success: false, code: 422, message: 'Only .xlsx or .xls files are allowed', timestamp: new Date().toISOString() } })
  }

  const wb     = XLSX.read(filePart.data, { type: 'buffer', cellDates: true })
  const ws     = wb.Sheets[wb.SheetNames[0]]
  const raw    = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false })
  const docMap = parseDocSheet(wb)

  // row 0 in json = spreadsheet row 2 (notes) — skip it
  const rows = raw.filter((_, i) => i !== 0)

  if (!rows.length) {
    return { success: true, code: 200, message: 'No data rows found', data: { inserted: 0, failed: 0, errors: [] }, timestamp: new Date().toISOString() }
  }

  const branchRows = await query(`SELECT id, code FROM branches WHERE status = 'A'`, {})
  const branchMap  = Object.fromEntries(branchRows.map(b => [b.CODE?.toUpperCase(), b.ID]))

  const staffId = event.context.staff?.id || null
  const errors  = []
  let inserted  = 0

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i]
    const rowNum = i + 3

    const plateRaw   = str(row.plate_number).toUpperCase()
    const branchCode = str(row.branch_code).toUpperCase()
    const rowErrors  = []

    if (!plateRaw)   rowErrors.push('plate_number is required')
    if (!branchCode) rowErrors.push('branch_code is required')

    const branchId = branchMap[branchCode]
    if (branchCode && !branchId) rowErrors.push(`branch_code "${branchCode}" not found`)

    const typeVal = str(row.type).toUpperCase()
    if (typeVal && !VALID_TYPES.includes(typeVal)) rowErrors.push(`type must be one of: ${VALID_TYPES.join(', ')}`)

    const ownType = str(row.ownership_type).toUpperCase() || 'OWN'
    if (!VALID_OWNERSHIP.includes(ownType)) rowErrors.push('ownership_type must be OWN or LEASE')

    const yearVal = row.year ? Number(row.year) : null
    if (row.year && isNaN(yearVal)) rowErrors.push('year must be a number')

    if (rowErrors.length) {
      errors.push({ row: rowNum, plate_number: plateRaw || '—', errors: rowErrors })
      continue
    }

    const dup = await query(`SELECT id FROM vehicles WHERE UPPER(plate_number) = :plate`, { plate: plateRaw })
    if (dup.length) {
      errors.push({ row: rowNum, plate_number: plateRaw, errors: ['Plate number already exists'] })
      continue
    }

    try {
      const result = await execute(
        `INSERT INTO vehicles (
           plate_number, branch_id, brand, model, color, year, type,
           ownership_type, engine_number, frame_number,
           parking_lot, parking_floor,
           owner_name, owner_email, owner_phone, owner_dob,
           status, verify_status, created_by
         ) VALUES (
           :plate_number, :branch_id, :brand, :model, :color, :year, :type,
           :ownership_type, :engine_number, :frame_number,
           :parking_lot, :parking_floor,
           :owner_name, :owner_email, :owner_phone,
           CASE WHEN :owner_dob IS NOT NULL THEN TO_DATE(:owner_dob, 'YYYY-MM-DD') ELSE NULL END,
           'AVAILABLE', 'PENDING', :created_by
         ) RETURNING id INTO :new_id`,
        {
          plate_number:   plateRaw,
          branch_id:      branchId,
          brand:          str(row.brand)          || null,
          model:          str(row.model)          || null,
          color:          str(row.color)          || null,
          year:           yearVal,
          type:           typeVal                 || null,
          ownership_type: ownType,
          engine_number:  str(row.engine_number)  || null,
          frame_number:   str(row.frame_number)   || null,
          parking_lot:    str(row.parking_lot)    || null,
          parking_floor:  str(row.parking_floor)  || null,
          owner_name:     str(row.owner_name)     || null,
          owner_email:    str(row.owner_email)    || null,
          owner_phone:    str(row.owner_phone)    || null,
          owner_dob:      str(row.owner_dob)      || null,
          created_by:     staffId,
          new_id:         { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        }
      )

      const newVehicleId = result.outBinds?.new_id?.[0]
      const docs = docMap[plateRaw] || []
      if (newVehicleId && docs.length) await insertDocs(newVehicleId, docs, staffId)

      inserted++
    } catch (e) {
      errors.push({ row: rowNum, plate_number: plateRaw, errors: [e.message || 'Database error'] })
    }
  }

  return {
    success: true,
    code: 200,
    message: `Bulk import complete: ${inserted} inserted, ${errors.length} failed`,
    data: { inserted, failed: errors.length, errors },
    timestamp: new Date().toISOString(),
  }
})
