import { mount } from '@vue/test-utils';
import AgentMessageBubble from 'widget/components/AgentMessageBubble.vue';
import UserMessageBubble from 'widget/components/UserMessageBubble.vue';
import UserMessage from 'widget/components/UserMessage.vue';

const global = {
  mocks: { $t: key => key },
  directives: { dompurifyHtml: () => {} },
};

describe('Praxis message metadata', () => {
  it('shows the patient message time and read receipt', () => {
    const wrapper = mount(UserMessageBubble, {
      props: {
        message: 'Guten Morgen',
        widgetColor: '#075e54',
        readableTime: '09:41',
        status: 'read',
      },
      global,
    });

    expect(wrapper.get('time').text()).toBe('09:41');
    expect(wrapper.get('[data-testid="message-receipt"]').classes()).toContain(
      'text-[#53bdeb]'
    );
  });

  it('shows the practice message time', () => {
    const wrapper = mount(AgentMessageBubble, {
      props: {
        message: 'Wie können wir helfen?',
        contentType: 'text',
        readableTime: '09:42',
      },
      global,
    });

    expect(wrapper.get('time').text()).toBe('09:42');
  });

  it('marks a patient message read after the practice opens the conversation', () => {
    const wrapper = mount(UserMessage, {
      props: {
        message: {
          id: 7,
          content: 'Guten Morgen',
          created_at: 1_788_667_200,
          status: 'sent',
          attachments: [],
        },
      },
      global: {
        mocks: {
          $store: {
            getters: {
              'appConfig/getWidgetColor': '#075e54',
              'conversationAttributes/getConversationParams': {
                agentLastSeenAt: 1_788_667_260,
              },
            },
            dispatch: vi.fn(),
          },
          $t: key => key,
        },
        directives: { dompurifyHtml: () => {} },
      },
    });

    expect(wrapper.getComponent(UserMessageBubble).props('status')).toBe(
      'read'
    );
  });
});
