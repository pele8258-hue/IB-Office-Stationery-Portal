import { defineStore } from 'pinia'

export const useVehiclesStore = defineStore('vehicles', {
  state: () => ({
    list: [] as any[],
    current: null as any,
  }),
  actions: {
    setList(data: any[]) { this.list = data },
    setCurrent(data: any) { this.current = data },
  },
})
