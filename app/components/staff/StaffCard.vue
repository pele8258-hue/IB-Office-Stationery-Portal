<script setup>
defineProps({ staff: Object })
</script>

<template>
  <div class="bg-white border rounded-lg p-4 hover:shadow transition">
    <div class="flex justify-between items-start">
      <div>
        <p class="font-semibold">{{ staff.name }}</p>
        <p class="text-sm text-gray-500">{{ staff.position }} — {{ staff.department_name }}</p>
        <p class="text-sm text-gray-500">{{ staff.branch_name }}</p>
      </div>
      <AppBadge
        :label="staff.status === 'A' ? 'Active' : staff.status === 'N' ? 'New' : 'Inactive'"
        :color="staff.status === 'A' ? 'green' : staff.status === 'N' ? 'yellow' : 'red'"
      />
    </div>
  </div>
</template>
