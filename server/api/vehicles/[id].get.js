// GET /api/vehicles/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // TODO: implement get vehicle by id
  return { success: true, data: null }
})
