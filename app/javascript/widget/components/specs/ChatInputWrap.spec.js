import { shallowMount } from '@vue/test-utils';
import ChatInputWrap from 'widget/components/ChatInputWrap.vue';

vi.mock('widget/composables/useAttachments', () => ({
  useAttachments: () => ({
    canHandleAttachments: true,
    shouldShowEmojiPicker: false,
    hasEmojiPickerEnabled: false,
  }),
}));

describe('ChatInputWrap', () => {
  it('shows the voice recorder when attachments are available and input is empty', () => {
    const wrapper = shallowMount(ChatInputWrap, {
      global: {
        directives: { 'on-clickaway': {} },
        mocks: {
          $store: {
            getters: {
              'appConfig/getWidgetColor': '#075e54',
              'appConfig/getIsWidgetOpen': false,
              'appConfig/getShouldShowEmojiPicker': false,
            },
            dispatch: vi.fn(),
          },
          $t: key => key,
        },
      },
    });

    expect(
      wrapper.findComponent({ name: 'PraxisVoiceRecorder' }).exists()
    ).toBe(true);
  });
});
