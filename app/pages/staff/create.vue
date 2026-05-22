<script setup>
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Add Staff</h1>
    <StaffForm />
  </div>
</template>
