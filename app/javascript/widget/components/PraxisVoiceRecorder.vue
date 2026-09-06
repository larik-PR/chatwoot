<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const props = defineProps({
  onAttach: { type: Function, default: () => {} },
});

defineOptions({ name: 'PraxisVoiceRecorder' });

const MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm;codecs=opus',
];

const isRecording = ref(false);
const elapsedSeconds = ref(0);
let chunks = [];
let recorder;
let stream;
let timer;
let shouldRecord = false;
let shouldDiscard = false;

const isSupported = computed(
  () =>
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
);
const duration = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});

const stopTracks = () => {
  stream?.getTracks().forEach(track => track.stop());
  stream = undefined;
};

const reset = () => {
  clearInterval(timer);
  timer = undefined;
  isRecording.value = false;
  elapsedSeconds.value = 0;
  recorder = undefined;
  chunks = [];
  stopTracks();
};

const fileExtension = mimeType => {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
};

const finishRecording = async () => {
  try {
    if (!shouldDiscard && chunks.length) {
      const mimeType = recorder.mimeType || chunks[0].type;
      const file = new File(
        chunks,
        `sprachnachricht.${fileExtension(mimeType)}`,
        {
          type: mimeType,
        }
      );
      await props.onAttach({
        file,
        fileType: 'audio',
        thumbUrl: URL.createObjectURL(file),
      });
    }
  } finally {
    reset();
  }
};

const startRecording = async () => {
  if (!isSupported.value || isRecording.value) return;
  shouldRecord = true;
  shouldDiscard = false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!shouldRecord) {
      stopTracks();
      return;
    }

    const mimeType = MIME_TYPES.find(type =>
      MediaRecorder.isTypeSupported(type)
    );
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = finishRecording;
    recorder.start();
    isRecording.value = true;
    timer = setInterval(() => {
      elapsedSeconds.value += 1;
    }, 1_000);
  } catch {
    reset();
  }
};

const stopRecording = () => {
  shouldRecord = false;
  if (recorder?.state !== 'inactive') recorder.stop();
};

const cancelRecording = () => {
  shouldDiscard = true;
  stopRecording();
};

onBeforeUnmount(cancelRecording);
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="flex items-center justify-center min-h-8 min-w-8 text-[#075e54] disabled:opacity-40"
      :aria-label="
        isRecording ? $t('VOICE_RECORDER.STOP') : $t('VOICE_RECORDER.START')
      "
      :disabled="!isSupported"
      data-testid="voice-record"
      @pointerdown.prevent="startRecording"
      @pointerup.prevent="stopRecording"
      @pointercancel="cancelRecording"
      @keydown.space.prevent="startRecording"
      @keyup.space.prevent="stopRecording"
    >
      <span v-if="!isRecording" class="i-ph-microphone text-xl" />
      <span
        v-else
        data-testid="voice-duration"
        class="min-w-11 text-xs tabular-nums text-n-slate-12"
      >
        {{ duration }}
      </span>
    </button>
    <button
      v-if="isRecording"
      type="button"
      class="flex items-center justify-center min-h-8 min-w-8 text-n-ruby-9"
      :aria-label="$t('VOICE_RECORDER.CANCEL')"
      data-testid="voice-cancel"
      @pointerdown.stop.prevent
      @click="cancelRecording"
    >
      <span class="i-ph-x-bold text-lg" />
    </button>
  </div>
</template>
