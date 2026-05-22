// GET /api/bookings/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // TODO: implement get booking by id
  return { success: true, data: null }
})
