<script setup>
defineProps({ staff: { type: Object, default: null } })
defineEmits(['submit'])
</script>

<template>
  <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="$emit('submit')">
    <AppInput label="Full Name" name="name" class="col-span-2" />
    <AppInput label="Email" name="email" type="email" />
    <AppInput label="Phone" name="phone" />
    <AppInput label="Position" name="position" />
    <!-- Branch, Department, Role selects go here -->
    <div class="col-span-2 flex justify-end">
      <AppButton type="submit">Save Staff</AppButton>
    </div>
  </form>
</template>
