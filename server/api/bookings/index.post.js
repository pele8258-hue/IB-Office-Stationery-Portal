// POST /api/bookings
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // TODO: implement create booking
  return { success: true }
})
