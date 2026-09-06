<script>
import { mapGetters } from 'vuex';

import ChatFooter from '../components/ChatFooter.vue';
import ConversationWrap from '../components/ConversationWrap.vue';
import { PRAXIS_WIDGET_THEME } from 'widget/theme/praxis';

const READ_RECEIPT_REFRESH_INTERVAL_MS = 15_000;

export default {
  components: { ChatFooter, ConversationWrap },
  data() {
    return {
      praxisTheme: PRAXIS_WIDGET_THEME,
      readReceiptRefreshTimer: null,
    };
  },
  computed: {
    ...mapGetters({
      groupedMessages: 'conversation/getGroupedConversation',
    }),
  },
  mounted() {
    this.$store.dispatch('conversation/setUserLastSeen');
    this.$store.dispatch('conversationAttributes/getAttributes');
    this.readReceiptRefreshTimer = setInterval(() => {
      this.$store.dispatch('conversationAttributes/getAttributes');
    }, READ_RECEIPT_REFRESH_INTERVAL_MS);
  },
  unmounted() {
    clearInterval(this.readReceiptRefreshTimer);
  },
};
</script>

<template>
  <div
    class="flex flex-col flex-1 overflow-hidden rounded-b-lg"
    :class="praxisTheme.conversation"
  >
    <div class="flex flex-1 overflow-auto">
      <ConversationWrap :grouped-messages="groupedMessages" />
    </div>
    <ChatFooter :class="praxisTheme.composer" />
  </div>
</template>
