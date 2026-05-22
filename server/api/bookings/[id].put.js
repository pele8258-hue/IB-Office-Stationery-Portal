// PUT /api/bookings/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  // TODO: implement update booking (approve/reject/complete)
  return { success: true }
})
