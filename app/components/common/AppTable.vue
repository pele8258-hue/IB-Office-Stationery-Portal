<script setup>
defineProps({
  columns: Array,
  rows: Array,
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <div class="overflow-x-auto rounded border border-gray-200">
    <table class="min-w-full text-sm">
      <thead class="bg-gray-50 text-gray-600 uppercase text-xs">
        <tr>
          <th v-for="col in columns" :key="col.key" class="px-4 py-3 text-left">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <tr v-if="loading">
          <td :colspan="columns?.length" class="text-center py-8 text-gray-400">Loading...</td>
        </tr>
        <tr v-else-if="!rows?.length">
          <td :colspan="columns?.length" class="text-center py-8 text-gray-400">No data found</td>
        </tr>
        <tr v-for="row in rows" v-else :key="row.id" class="hover:bg-gray-50">
          <td v-for="col in columns" :key="col.key" class="px-4 py-3">
            <slot :name="col.key" :row="row">{{ row[col.key] }}</slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
