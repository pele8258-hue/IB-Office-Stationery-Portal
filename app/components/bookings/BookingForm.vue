<script setup>
defineEmits(['submit'])
</script>

<template>
  <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="$emit('submit')">
    <AppInput label="Destination" name="destination" class="col-span-2" />
    <AppInput label="Purpose" name="purpose" class="col-span-2" />
    <AppInput label="Planned Departure" name="requested_time_out" type="datetime-local" />
    <AppInput label="Planned Return" name="requested_time_in" type="datetime-local" />
    <PassengerSelect class="col-span-2" />
    <div class="col-span-2 flex justify-end">
      <AppButton type="submit">Submit Request</AppButton>
    </div>
  </form>
</template>
