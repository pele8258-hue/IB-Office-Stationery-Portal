/**
 * POST /api/vehicles/:id/documents
 * Upload a document for a vehicle
 * Body (multipart): document_name*, issued_date, expiry_date, file
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { execute, query } from '../../../utils/db.js'

export default defineEventHandler(async (event) => {
  const vehicleId = Number(event.context.params.id)
  if (!vehicleId) {
    throw createError({ statusCode: 400, data: { success: false, code: 400, message: 'Invalid vehicle ID', timestamp: new Date().toISOString() } })
  }

  const existing = await query(`SELECT id FROM vehicles WHERE id = :id`, { id: vehicleId })
  if (!existing.length) {
    throw createError({ statusCode: 404, data: { success: false, code: 404, message: 'Vehicle not found', timestamp: new Date().toISOString() } })
  }

  const parts = await readMultipartFormData(event)
  const get = (name) => parts?.find(p => p.name === name)?.data?.toString()?.trim() || null

  const documentName = get('document_name')
  if (!documentName) {
    throw createError({
      statusCode: 422,
      data: { success: false, code: 422, message: 'Validation failed', errors: { document_name: ['Document name is required'] }, timestamp: new Date().toISOString() },
    })
  }

  const issuedDate = get('issued_date') || null
  const expiryDate = get('expiry_date') || null
  const filePart   = parts?.find(p => p.name === 'file' && p.filename)

  let filePath = null
  if (filePart) {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp']
    const ext = extname(filePart.filename).toLowerCase()
    if (!allowed.includes(ext)) {
      throw createError({ statusCode: 422, data: { success: false, code: 422, message: 'Invalid file type. Allowed: jpg, jpeg, png, pdf, webp', timestamp: new Date().toISOString() } })
    }
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'vehicles')
    await mkdir(uploadDir, { recursive: true })
    const fileName = `veh_${vehicleId}_${Date.now()}${ext}`
    await writeFile(join(uploadDir, fileName), filePart.data)
    filePath = `/uploads/vehicles/${fileName}`
  }

  await execute(
    `INSERT INTO vehicle_documents (vehicle_id, document_name, issued_date, expiry_date, file_path, uploaded_by)
     VALUES (:vehicle_id, :document_name,
       CASE WHEN :issued_date IS NOT NULL THEN TO_DATE(:issued_date, 'YYYY-MM-DD') ELSE NULL END,
       CASE WHEN :expiry_date IS NOT NULL THEN TO_DATE(:expiry_date, 'YYYY-MM-DD') ELSE NULL END,
       :file_path, :uploaded_by)`,
    {
      vehicle_id:    vehicleId,
      document_name: documentName,
      issued_date:   issuedDate,
      expiry_date:   expiryDate,
      file_path:     filePath,
      uploaded_by:   event.context.staff?.id || null,
    }
  )

  return {
    success: true,
    code: 201,
    message: 'Document uploaded successfully',
    data: { document_name: documentName, file_path: filePath },
    timestamp: new Date().toISOString(),
  }
})
