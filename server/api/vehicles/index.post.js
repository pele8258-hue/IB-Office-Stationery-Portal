// POST /api/vehicles
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // TODO: implement create vehicle
  return { success: true }
})
