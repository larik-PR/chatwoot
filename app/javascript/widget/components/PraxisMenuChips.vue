<script setup>
import { ref } from 'vue';
import { PRAXIS_WIDGET_THEME } from 'widget/theme/praxis';

defineProps({
  options: { type: Array, default: () => [] },
});

const emit = defineEmits(['optionSelect']);

defineOptions({ name: 'PraxisMenuChips' });

const selectedValue = ref('');

const selectOption = option => {
  if (selectedValue.value) return;
  selectedValue.value = option.value;
  emit('optionSelect', option);
};
</script>

<template>
  <div :class="PRAXIS_WIDGET_THEME.menu">
    <template v-if="!selectedValue">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="PRAXIS_WIDGET_THEME.menuOption"
        @click="selectOption(option)"
      >
        {{ option.title }}
      </button>
    </template>
  </div>
</template>
