import { config, flushPromises, mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PraxisVoiceRecorder from 'widget/components/PraxisVoiceRecorder.vue';
import de from 'widget/i18n/locale/de.json';
import en from 'widget/i18n/locale/en.json';

class MediaRecorderMock {
  static isTypeSupported(type) {
    return type === 'audio/ogg;codecs=opus';
  }

  constructor(stream, { mimeType }) {
    this.stream = stream;
    this.mimeType = mimeType;
    this.state = 'inactive';
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable({
      data: new Blob(['voice'], { type: this.mimeType }),
    });
    this.onstop();
  }
}

describe('PraxisVoiceRecorder', () => {
  const trackStop = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    trackStop.mockClear();
    vi.stubGlobal('MediaRecorder', MediaRecorderMock);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: trackStop }],
        }),
      },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:voice-note'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const mountRecorder = onAttach =>
    mount(PraxisVoiceRecorder, {
      props: { onAttach },
      global: { mocks: { $t: key => key } },
    });

  it('records while pressed, shows elapsed time, and uploads on release', async () => {
    const onAttach = vi.fn();
    const wrapper = mountRecorder(onAttach);

    await wrapper.get('[data-testid="voice-record"]').trigger('pointerdown');
    await flushPromises();
    expect(wrapper.get('[data-testid="voice-duration"]').text()).toBe('00:00');

    vi.advanceTimersByTime(1_000);
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="voice-duration"]').text()).toBe('00:01');

    await wrapper.get('[data-testid="voice-record"]').trigger('pointerup');
    await flushPromises();

    expect(onAttach).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.any(File),
        fileType: 'audio',
        thumbUrl: 'blob:voice-note',
      })
    );
    expect(onAttach.mock.calls[0][0].file.name).toBe('sprachnachricht.ogg');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:voice-note');
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('shows the limit and automatically sends at 120 seconds', async () => {
    const onAttach = vi.fn();
    const wrapper = mountRecorder(onAttach);

    expect(wrapper.text()).toContain('VOICE_RECORDER.HINT');
    await wrapper.get('[data-testid="voice-record"]').trigger('pointerdown');
    await flushPromises();

    vi.advanceTimersByTime(120_000);
    await flushPromises();

    expect(onAttach).toHaveBeenCalledOnce();
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('shows the German permission message when microphone access is denied', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(
      new DOMException('denied', 'NotAllowedError')
    );
    const i18n = createI18n({
      legacy: false,
      locale: 'de',
      fallbackLocale: 'en',
      messages: { de, en },
    });
    const originalPlugins = config.global.plugins;
    config.global.plugins = [i18n];
    const wrapper = mount(PraxisVoiceRecorder);
    config.global.plugins = originalPlugins;

    await wrapper.get('[data-testid="voice-record"]').trigger('pointerdown');
    await flushPromises();

    expect(wrapper.text()).toContain('Mikrofon nicht freigegeben');
  });

  it('discards a recording without uploading it', async () => {
    const onAttach = vi.fn();
    const wrapper = mountRecorder(onAttach);

    await wrapper.get('[data-testid="voice-record"]').trigger('pointerdown');
    await flushPromises();
    await wrapper.get('[data-testid="voice-cancel"]').trigger('click');
    await flushPromises();

    expect(onAttach).not.toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('cancels when the pointer leaves the recording button', async () => {
    const onAttach = vi.fn();
    const wrapper = mountRecorder(onAttach);

    await wrapper.get('[data-testid="voice-record"]').trigger('pointerdown');
    await flushPromises();
    wrapper
      .get('[data-testid="voice-record"]')
      .element.dispatchEvent(new MouseEvent('pointerleave', { buttons: 1 }));
    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(onAttach).not.toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('cancels safely while microphone permission is still pending', async () => {
    let resolveStream;
    navigator.mediaDevices.getUserMedia.mockReturnValue(
      new Promise(resolve => {
        resolveStream = resolve;
      })
    );
    const wrapper = mountRecorder(vi.fn());

    wrapper.get('[data-testid="voice-record"]').trigger('pointerdown');
    await Promise.resolve();
    wrapper
      .get('[data-testid="voice-record"]')
      .element.dispatchEvent(new MouseEvent('pointerleave', { buttons: 1 }));
    await wrapper.vm.$nextTick();
    resolveStream({ getTracks: () => [{ stop: trackStop }] });
    await flushPromises();

    expect(trackStop).toHaveBeenCalledOnce();
  });
});
