// PUT /api/vehicles/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  // TODO: implement update vehicle
  return { success: true }
})
