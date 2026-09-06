import { flushPromises, mount } from '@vue/test-utils';
import PraxisVoiceRecorder from 'widget/components/PraxisVoiceRecorder.vue';

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
    expect(trackStop).toHaveBeenCalledOnce();
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
});
