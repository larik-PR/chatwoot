import { shallowMount } from '@vue/test-utils';
import Messages from 'widget/views/Messages.vue';

describe('Praxis widget message theme', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps the conversation and composer in the Praxis mobile layout', () => {
    const wrapper = shallowMount(Messages, {
      global: {
        mocks: {
          $store: {
            getters: {
              'conversation/getGroupedConversation': [],
            },
            dispatch: vi.fn(),
          },
        },
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['bg-[#efeae2]', 'rounded-b-lg'])
    );
    expect(wrapper.html()).toMatchSnapshot();

    vi.advanceTimersByTime(15_000);
    expect(wrapper.vm.$store.dispatch).toHaveBeenCalledWith(
      'conversationAttributes/getAttributes'
    );
  });
});
