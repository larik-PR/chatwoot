import { shallowMount } from '@vue/test-utils';
import ChatHeader from 'widget/components/ChatHeader.vue';

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('widget/composables/useAvailability', () => ({
  useAvailability: () => ({ isOnline: false }),
}));

describe('Praxis widget header', () => {
  const originalGlobalConfig = window.globalConfig;

  afterEach(() => {
    window.globalConfig = originalGlobalConfig;
  });

  it('shows the configured practice identity in the branded header', () => {
    const wrapper = shallowMount(ChatHeader, {
      props: {
        title: 'Praxis Dr. Larik',
        avatarUrl: '/praxis-logo.png',
      },
      global: {
        directives: {
          dompurifyHtml: {
            mounted: (element, binding) => {
              element.textContent = binding.value;
            },
          },
        },
      },
    });

    expect(wrapper.get('header').classes()).toContain('bg-[#075e54]');
    expect(wrapper.text()).toContain('Praxis Dr. Larik');
    expect(wrapper.get('img').attributes('src')).toBe('/praxis-logo.png');
  });

  it('falls back to the installed practice logo', () => {
    window.globalConfig = {
      LOGO_THUMBNAIL: '/praxis-branding/praxis-larik-logo-thumbnail.png',
    };

    const wrapper = shallowMount(ChatHeader, {
      props: { title: 'Praxis Dr. Larik' },
      global: { directives: { dompurifyHtml: () => {} } },
    });

    expect(wrapper.get('img').attributes('src')).toBe(
      '/praxis-branding/praxis-larik-logo-thumbnail.png'
    );
  });
});
