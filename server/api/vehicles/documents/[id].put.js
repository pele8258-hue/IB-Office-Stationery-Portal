/**
 * PUT /api/vehicles/documents/:id
 * Update a vehicle document (name, dates, optional new file)
 * Body (multipart): document_name*, issued_date, expiry_date, file (optional)
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { execute, query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const docId = Number(getRouterParam(event, 'id'))
  if (!docId) throw createError({ statusCode: 400, data: { success: false, message: 'Invalid document ID' } })

  const existing = await query(`SELECT id, file_path FROM vehicle_documents WHERE id = :id`, { id: docId })
  if (!existing.length) throw createError({ statusCode: 404, data: { success: false, message: 'Document not found' } })

  const parts = await readMultipartFormData(event)
  const get   = (name) => parts?.find(p => p.name === name)?.data?.toString()?.trim() || null

  const documentName = get('document_name')
  if (!documentName) {
    throw createError({
      statusCode: 422,
      data: { success: false, code: 422, message: 'Validation failed', errors: { document_name: ['Document name is required'] } },
    })
  }

  const issuedDate = get('issued_date') || null
  const expiryDate = get('expiry_date') || null
  const vehicleId  = get('vehicle_id') ? Number(get('vehicle_id')) : null
  const filePart   = parts?.find(p => p.name === 'file' && p.filename)

  // Validate vehicle_id if provided
  if (vehicleId) {
    const veh = await query(`SELECT id FROM vehicles WHERE id = :id`, { id: vehicleId })
    if (!veh.length) {
      throw createError({ statusCode: 404, data: { success: false, message: 'Target vehicle not found' } })
    }
  }

  let filePath = existing[0].FILE_PATH

  if (filePart) {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp']
    const ext     = extname(filePart.filename).toLowerCase()
    if (!allowed.includes(ext)) {
      throw createError({ statusCode: 422, data: { success: false, message: 'Invalid file type. Allowed: jpg, jpeg, png, pdf, webp' } })
    }
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'vehicles')
    await mkdir(uploadDir, { recursive: true })
    const fileName = `veh_doc_${docId}_${Date.now()}${ext}`
    await writeFile(join(uploadDir, fileName), filePart.data)
    filePath = `/uploads/vehicles/${fileName}`
  }

  await execute(
    `UPDATE vehicle_documents
     SET document_name = :document_name,
         vehicle_id    = CASE WHEN :vehicle_id IS NOT NULL THEN :vehicle_id ELSE vehicle_id END,
         issued_date   = CASE WHEN :issued_date IS NOT NULL THEN TO_DATE(:issued_date, 'YYYY-MM-DD') ELSE NULL END,
         expiry_date   = CASE WHEN :expiry_date IS NOT NULL THEN TO_DATE(:expiry_date, 'YYYY-MM-DD') ELSE NULL END,
         file_path     = :file_path,
         updated_at    = CURRENT_TIMESTAMP
     WHERE id = :id`,
    { document_name: documentName, vehicle_id: vehicleId, issued_date: issuedDate, expiry_date: expiryDate, file_path: filePath, id: docId }
  )

  return {
    success: true,
    code: 200,
    message: 'Document updated successfully',
    data: { id: docId, document_name: documentName, file_path: filePath },
    timestamp: new Date().toISOString(),
  }
})
