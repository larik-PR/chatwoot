import { mount } from '@vue/test-utils';
import AgentMessageBubble from 'widget/components/AgentMessageBubble.vue';

describe('Praxis menu chips', () => {
  it('sends the selected menu value as a patient message', async () => {
    const dispatch = vi.fn();
    const wrapper = mount(AgentMessageBubble, {
      props: {
        message: 'Wie können wir Ihnen helfen?',
        messageId: 42,
        contentType: 'text',
        messageContentAttributes: {
          praxis_menu_options: [
            { title: 'Termin vereinbaren', value: 'termin_vereinbaren' },
            { title: 'Freie Frage', value: 'freie_frage' },
          ],
        },
      },
      global: {
        mocks: {
          $store: { dispatch },
        },
        directives: {
          dompurifyHtml: () => {},
        },
      },
    });

    const options = wrapper.findAll('button');
    expect(options.map(option => option.text())).toEqual([
      'Termin vereinbaren',
      'Freie Frage',
    ]);

    await options[1].trigger('click');

    expect(dispatch).toHaveBeenCalledWith('conversation/sendMessage', {
      content: 'freie_frage',
    });
    expect(wrapper.findAll('button')).toHaveLength(0);
  });
});
