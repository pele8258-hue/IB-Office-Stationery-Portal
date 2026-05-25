/**
 * GET /api/vehicles/template
 * Download the Excel upload template for bulk vehicle import.
 * Sheet 1: Vehicles  — one row per vehicle
 * Sheet 2: Documents — one row per document (unlimited), linked by plate_number
 * Sheet 3: Branch Ref — valid branch codes from DB
 */
import { createRequire } from 'node:module'
const XLSX = createRequire(import.meta.url)('xlsx')
import { query } from '../../utils/db.js'

export default defineEventHandler(async (event) => {
  const branches   = await query(`SELECT code, name FROM branches WHERE status = 'A' ORDER BY code`, {})
  const branchCodes = branches.map(b => b.CODE)
  const firstCode   = branchCodes[0] || 'BRANCH_CODE'
  const codesHint   = `* Required. Available: ${branchCodes.join(', ')}`

  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Vehicles ──────────────────────────────────────────────────────
  const vHeaders = [
    'plate_number', 'branch_code', 'brand', 'model', 'color', 'year',
    'type', 'ownership_type', 'engine_number', 'frame_number',
    'parking_lot', 'parking_floor',
    'owner_name', 'owner_email', 'owner_phone', 'owner_dob',
  ]
  const vNotes = [
    '* Required', codesHint, '', '', '', 'e.g. 2022',
    'SEDAN/VAN/TRUCK/SUV/PICKUP/OTHER', 'OWN or LEASE', '', '',
    '', '',
    '', '', '', 'YYYY-MM-DD',
  ]
  const vSample = [
    'ກຂ 1234', firstCode, 'Toyota', 'Hilux', 'White', '2022',
    'PICKUP', 'OWN', 'ENG001', 'FRM001',
    'A', 'B1',
    'John Doe', 'john@example.com', '020 1234 5678', '1990-01-15',
  ]

  const wsV = XLSX.utils.aoa_to_sheet([vHeaders, vNotes, vSample])
  wsV['!cols'] = [
    { wch: 16 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 6 },
    { wch: 10 }, { wch: 13 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 },
    { wch: 20 }, { wch: 24 }, { wch: 16 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, wsV, 'Vehicles')

  // ── Sheet 2: Documents ─────────────────────────────────────────────────────
  const dHeaders = ['plate_number', 'document_name', 'issued_date', 'expiry_date']
  const dNotes   = ['* Must match a plate in Vehicles sheet', '* Required', 'YYYY-MM-DD', 'YYYY-MM-DD']
  const dSamples = [
    ['ກຂ 1234', 'Road Tax',   '2025-01-01', '2026-01-01'],
    ['ກຂ 1234', 'Insurance',  '2025-03-01', '2026-03-01'],
    ['ກຂ 1234', 'Lease Agreement', '2024-06-01', '2027-06-01'],
  ]

  const wsD = XLSX.utils.aoa_to_sheet([dHeaders, dNotes, ...dSamples])
  wsD['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsD, 'Documents')

  // ── Sheet 3: Branch reference ──────────────────────────────────────────────
  const wsRef = XLSX.utils.aoa_to_sheet([
    ['branch_code', 'branch_name'],
    ...branches.map(b => [b.CODE, b.NAME]),
  ])
  wsRef['!cols'] = [{ wch: 20 }, { wch: 36 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Branch Ref')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  setResponseHeaders(event, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="vehicle_import_template.xlsx"',
  })

  return buf
})
