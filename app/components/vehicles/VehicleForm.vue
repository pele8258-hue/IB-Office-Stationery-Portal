<script setup>
defineProps({ vehicle: { type: Object, default: null } })
defineEmits(['submit'])
</script>

<template>
  <form class="grid grid-cols-1 md:grid-cols-2 gap-4" @submit.prevent="$emit('submit')">
    <AppInput label="Plate Number" name="plate_number" />
    <AppInput label="Part Number" name="part_number" />
    <AppInput label="Engine Number" name="engine_number" />
    <AppInput label="Frame Number" name="frame_number" />
    <AppInput label="Brand" name="brand" />
    <AppInput label="Model" name="model" />
    <AppInput label="Color" name="color" />
    <AppInput label="Year" name="year" type="number" />
    <AppInput label="Parking Lot" name="parking_lot" />
    <AppInput label="Parking Floor" name="parking_floor" />
    <AppInput label="Road Tax Expiry" name="road_tax_expiry" type="date" />
    <AppInput label="Insurance Expiry" name="insurance_expiry" type="date" />
    <AppInput label="Owner Name" name="owner_name" />
    <AppInput label="Owner Email" name="owner_email" type="email" />
    <AppInput label="Owner Phone" name="owner_phone" />
    <AppInput label="Owner Date of Birth" name="owner_dob" type="date" />
    <div class="col-span-2 flex justify-end">
      <AppButton type="submit">Save Vehicle</AppButton>
    </div>
  </form>
</template>
