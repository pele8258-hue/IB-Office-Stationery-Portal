import { defineStore } from 'pinia'

export const useBookingsStore = defineStore('bookings', {
  state: () => ({
    list: [] as any[],
    current: null as any,
  }),
  actions: {
    setList(data: any[]) { this.list = data },
    setCurrent(data: any) { this.current = data },
  },
})
