<script setup>
const props = defineProps({
  modelValue: { type: [File, null], default: null },
  preview:    { type: String,       default: '' },
  color:      { type: String,       default: 'blue' },
})
const emit = defineEmits(['update:modelValue', 'update:preview'])

// ── Gallery ────────────────────────────────────────────────────────────────────
const galleryRef = ref(null)

function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  emit('update:modelValue', file)
  const reader = new FileReader()
  reader.onload = (ev) => emit('update:preview', ev.target.result)
  reader.readAsDataURL(file)
  e.target.value = ''
}

// ── Camera (getUserMedia — works on laptop + mobile) ──────────────────────────
const cameraOpen    = ref(false)
const capturedFrame = ref('')   // data-URL after shutter click
const videoRef      = ref(null)
const canvasRef     = ref(null)
const camError      = ref('')
let   stream        = null

async function openCamera() {
  camError.value      = ''
  capturedFrame.value = ''
  cameraOpen.value    = true
  await nextTick()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      videoRef.value.play()
    }
  } catch {
    // retry without facingMode (desktop webcam)
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoRef.value) { videoRef.value.srcObject = stream; videoRef.value.play() }
    } catch (err) {
      camError.value   = 'Camera not available or permission denied.'
      cameraOpen.value = false
    }
  }
}

function shutter() {
  const v = videoRef.value
  const c = canvasRef.value
  if (!v || !c) return
  c.width  = v.videoWidth  || 1280
  c.height = v.videoHeight || 720
  c.getContext('2d').drawImage(v, 0, 0)
  capturedFrame.value = c.toDataURL('image/jpeg', 0.88)
}

function retake() {
  capturedFrame.value = ''
}

function usePhoto() {
  if (!capturedFrame.value) return
  // Convert data-URL → File
  const [header, b64] = capturedFrame.value.split(',')
  const mime  = header.match(/:(.*?);/)[1]
  const bytes = atob(b64)
  const arr   = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const file  = new File([arr], `photo_${Date.now()}.jpg`, { type: mime })
  emit('update:modelValue', file)
  emit('update:preview', capturedFrame.value)
  closeCamera()
}

function closeCamera() {
  stream?.getTracks().forEach(t => t.stop())
  stream              = null
  cameraOpen.value    = false
  capturedFrame.value = ''
}

function clear() {
  emit('update:modelValue', null)
  emit('update:preview', '')
}

onUnmounted(closeCamera)

// ── Accent ────────────────────────────────────────────────────────────────────
const accent = computed(() => props.color === 'green'
  ? { bg: 'bg-green-50', text: 'text-green-600', btn: 'bg-green-500 hover:bg-green-600', hover: 'hover:border-green-400 hover:bg-green-50/60' }
  : { bg: 'bg-blue-50',  text: 'text-blue-600',  btn: 'bg-blue-500 hover:bg-blue-600',   hover: 'hover:border-blue-400 hover:bg-blue-50/60'  }
)
</script>

<template>
  <div>

    <!-- ── Empty state ──────────────────────────────────────────────────────── -->
    <div v-if="!preview" class="border-2 border-dashed border-gray-200 rounded-xl p-3">
      <div class="grid grid-cols-2 gap-2">

        <!-- Camera button -->
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 transition-all"
          :class="accent.hover"
          @click="openCamera"
        >
          <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="accent.bg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :class="accent.text">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="1.8"/>
            </svg>
          </div>
          <span class="text-[11px] font-semibold text-gray-600">Camera</span>
          <span class="text-[10px] text-gray-400">Take a photo</span>
        </button>

        <!-- Gallery button -->
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 transition-all"
          :class="accent.hover"
          @click="galleryRef.click()"
        >
          <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="accent.bg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" :class="accent.text">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span class="text-[11px] font-semibold text-gray-600">Gallery</span>
          <span class="text-[10px] text-gray-400">Upload from device</span>
        </button>

      </div>
      <input ref="galleryRef" type="file" accept=".jpg,.jpeg,.png,.webp" class="hidden" @change="onFile" />
    </div>

    <!-- ── Preview ─────────────────────────────────────────────────────────── -->
    <div v-else class="relative rounded-xl overflow-hidden border border-gray-200 group">
      <img :src="preview" class="w-full h-36 object-cover" />
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg text-[11px] font-semibold text-gray-700 shadow hover:bg-white" @click="openCamera">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="2"/></svg>
            Retake
          </button>
          <button type="button" class="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-lg text-[11px] font-semibold text-gray-700 shadow hover:bg-white" @click="galleryRef.click()">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/><path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Change
          </button>
        </div>
      </div>
      <button type="button" class="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors" @click="clear">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
      </button>
      <input ref="galleryRef" type="file" accept=".jpg,.jpeg,.png,.webp" class="hidden" @change="onFile" />
    </div>

    <!-- ── Camera modal (Teleport to body to avoid z-index issues) ──────────── -->
    <Teleport to="body">
      <Transition name="cam">
        <div v-if="cameraOpen" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4">
          <div class="relative bg-black rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl">

            <!-- Header bar -->
            <div class="flex items-center justify-between px-4 py-3 bg-black/60">
              <span class="text-sm font-semibold text-white">{{ capturedFrame ? 'Preview' : 'Camera' }}</span>
              <button type="button" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" @click="closeCamera">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
              </button>
            </div>

            <!-- Live feed -->
            <div v-show="!capturedFrame" class="relative bg-black aspect-video flex items-center justify-center">
              <video ref="videoRef" autoplay playsinline muted class="w-full h-full object-cover"></video>
            </div>

            <!-- Captured preview -->
            <div v-if="capturedFrame" class="aspect-video bg-black">
              <img :src="capturedFrame" class="w-full h-full object-cover" />
            </div>

            <!-- Controls -->
            <div class="flex items-center justify-center gap-4 px-6 py-5 bg-black/60">

              <!-- Live feed controls -->
              <template v-if="!capturedFrame">
                <button type="button" class="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors text-[11px]" @click="closeCamera">
                  <div class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                  </div>
                  Cancel
                </button>

                <!-- Shutter button -->
                <button type="button" class="flex flex-col items-center gap-1 transition-transform active:scale-95" @click="shutter">
                  <div class="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <div class="w-12 h-12 rounded-full border-4 border-black/10 bg-white"></div>
                  </div>
                </button>

                <div class="w-10 h-10"></div><!-- spacer -->
              </template>

              <!-- After capture controls -->
              <template v-else>
                <button type="button" class="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors text-[11px]" @click="retake">
                  <div class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  Retake
                </button>

                <button
                  type="button"
                  class="flex flex-col items-center gap-1 text-white text-[11px] font-semibold"
                  @click="usePhoto"
                >
                  <div class="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-opacity hover:opacity-90" :class="accent.btn">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </div>
                  Use Photo
                </button>

                <div class="w-10 h-10"></div><!-- spacer -->
              </template>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Hidden canvas for frame capture -->
    <canvas ref="canvasRef" class="hidden"></canvas>

  </div>
</template>

<style scoped>
.cam-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.cam-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.cam-enter-from, .cam-leave-to { opacity: 0; transform: scale(0.97); }
</style>
