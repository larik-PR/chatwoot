import { mount } from '@vue/test-utils';
import UserMessage from 'widget/components/UserMessage.vue';

describe('UserMessage audio attachment', () => {
  it('renders a recorded voice message with native audio controls', () => {
    const wrapper = mount(UserMessage, {
      props: {
        message: {
          id: 12,
          content: '',
          status: 'sent',
          created_at: 1_788_667_200,
          attachments: [
            {
              id: 7,
              file_type: 'audio',
              data_url: 'https://example.test/voice.ogg',
            },
          ],
        },
      },
      global: {
        mocks: {
          $store: {
            getters: { 'appConfig/getWidgetColor': '#075e54' },
            dispatch: vi.fn(),
          },
          $t: key => key,
        },
      },
    });

    expect(wrapper.get('audio').attributes('controls')).toBeDefined();
    expect(wrapper.get('audio source').attributes('src')).toBe(
      'https://example.test/voice.ogg'
    );
  });
});
