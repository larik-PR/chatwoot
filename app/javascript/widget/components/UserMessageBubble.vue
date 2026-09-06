<script>
import { useMessageFormatter } from 'shared/composables/useMessageFormatter';
import { getContrastingTextColor } from '@chatwoot/utils';

export default {
  name: 'UserMessageBubble',
  props: {
    message: {
      type: String,
      default: '',
    },
    widgetColor: {
      type: String,
      default: '',
    },
    readableTime: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: '',
    },
  },
  setup() {
    const { formatMessage } = useMessageFormatter();
    return {
      formatMessage,
    };
  },
  computed: {
    textColor() {
      return getContrastingTextColor(this.widgetColor);
    },
  },
};
</script>

<template>
  <div
    class="chat-bubble user"
    :style="{ background: widgetColor, color: textColor }"
  >
    <div v-dompurify-html="formatMessage(message, false)" />
    <div
      v-if="readableTime"
      class="mt-1 flex items-center justify-end gap-1 text-[0.6875rem] leading-none text-white/70"
    >
      <time>{{ readableTime }}</time>
      <span
        data-testid="message-receipt"
        :class="[
          status === 'read'
            ? 'i-ph-checks-bold text-[#53bdeb]'
            : 'i-ph-check-bold',
        ]"
        aria-hidden="true"
      />
      <span class="sr-only">
        {{
          status === 'read'
            ? $t('MESSAGE_STATUS.READ')
            : $t('MESSAGE_STATUS.SENT')
        }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chat-bubble.user {
  :deep(p code) {
    @apply bg-n-alpha-2 dark:bg-n-alpha-1 text-white;
  }

  :deep(pre) {
    @apply text-white bg-n-alpha-2 dark:bg-n-alpha-1;

    code {
      @apply bg-transparent text-white;
    }
  }

  :deep(blockquote) {
    @apply bg-transparent border-n-slate-7 ltr:border-l-2 rtl:border-r-2 border-solid;

    p {
      @apply text-n-slate-5 dark:text-n-slate-12/90;
    }
  }
}
</style>
