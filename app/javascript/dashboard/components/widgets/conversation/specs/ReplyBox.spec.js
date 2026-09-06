import { shallowMount } from '@vue/test-utils';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { nextTick } from 'vue';
import { createStore } from 'vuex';
import ReplyBox from '../ReplyBox.vue';
import WhatsappTemplates from '../WhatsappTemplates/Modal.vue';

const CHANNELS = [
  { name: 'WhatsApp Cloud', inbox: { channel_type: 'Channel::Whatsapp' } },
  {
    name: 'Twilio WhatsApp',
    inbox: { channel_type: 'Channel::TwilioSms', medium: 'whatsapp' },
  },
  { name: 'API', inbox: { channel_type: 'Channel::Api' } },
  { name: 'Instagram', inbox: { channel_type: 'Channel::Instagram' } },
  { name: 'TikTok', inbox: { channel_type: 'Channel::Tiktok' } },
  { name: 'Facebook', inbox: { channel_type: 'Channel::FacebookPage' } },
  { name: 'Line', inbox: { channel_type: 'Channel::Line' } },
  { name: 'Telegram', inbox: { channel_type: 'Channel::Telegram' } },
  { name: 'Email', inbox: { channel_type: 'Channel::Email' } },
  { name: 'Web widget', inbox: { channel_type: 'Channel::WebWidget' } },
];

const exemptFromMessagingWindow = name =>
  ['WhatsApp Cloud', 'Twilio WhatsApp', 'API'].includes(name);

const REPLIABLE = {
  id: 1,
  inbox_id: 1,
  can_reply: true,
  status: 'open',
  meta: { sender: { id: 2 } },
  messages: [],
};

const buildStore = ({
  inbox,
  chat,
  templates,
  drafts = {},
  inboxes,
  isMetaMessageSendingDisabled = false,
}) =>
  createStore({
    state: {
      chat: { ...REPLIABLE, ...chat },
      replyEditorMode: REPLY_EDITOR_MODES.REPLY,
      drafts: { ...drafts },
    },
    mutations: {
      selectChat: (s, c) => {
        s.chat = c;
      },
      setReplyEditorMode: (s, mode) => {
        s.replyEditorMode = mode;
      },
      setDraft: (s, { key, message }) => {
        s.drafts = { ...s.drafts, [key]: message };
      },
    },
    actions: {
      'draftMessages/setReplyEditorMode': ({ commit }, { mode }) =>
        commit('setReplyEditorMode', mode),
      'draftMessages/set': ({ commit }, payload) => commit('setDraft', payload),
    },
    getters: {
      getSelectedChat: s => s.chat,
      getCurrentUser: () => ({ id: 7, name: 'Agent', accounts: [] }),
      getCurrentAccountId: () => 1,
      getMessageSignature: () => '',
      getUISettings: () => ({}),
      getLastEmailInSelectedChat: () => null,
      'globalConfig/get': () => ({}),
      'globalConfig/isMetaMessageSendingDisabled': () =>
        isMetaMessageSendingDisabled,
      'inboxes/getInbox': () => inboxId => ({
        id: inboxId,
        ...(inboxes?.[inboxId] || inbox),
      }),
      'inboxes/getWhatsAppTemplates': () => () => templates,
      'contacts/getContact': () => () => ({}),
      'draftMessages/get': s => key => s.drafts[key] || '',
      'draftMessages/getReplyEditorMode': s => s.replyEditorMode,
      'accounts/isFeatureEnabledonAccount': () => () => false,
      'accounts/getAccount': () => () => ({}),
      'portals/allPortals': () => [],
      'integrations/getUIFlags': () => ({ isFetching: false }),
    },
  });

const mountWith = ({
  inbox,
  chat,
  templates = [{ name: 'greeting' }],
  drafts,
  inboxes,
  isMetaMessageSendingDisabled,
}) => {
  const store = buildStore({
    inbox,
    chat,
    templates,
    drafts,
    inboxes,
    isMetaMessageSendingDisabled,
  });
  const wrapper = shallowMount(ReplyBox, {
    global: {
      plugins: [store],
      mocks: { $t: key => key },
      // The bottom panel sits inside a <Transition>, which shallowMount stubs
      // without rendering its children.
      stubs: { transition: false },
    },
  });
  return { wrapper, store };
};

const topPanel = wrapper =>
  wrapper.findComponent({ name: 'ReplyTopPanel' }).props();
const bottomPanel = wrapper =>
  wrapper.findComponent({ name: 'ReplyBottomPanel' }).props();
const editor = wrapper =>
  wrapper.findComponent({ name: 'WootMessageEditor' }).props();

describe('ReplyBox', () => {
  describe('Praxis bridge sends', () => {
    let originalAxios;
    let axiosMock;
    const signedContext = {
      context: 'signed-dashboard-context',
      signature: `sha256=${'a'.repeat(64)}`,
      expiresAt: '2099-01-01T00:10:00Z',
    };
    const refreshedContext = {
      context: 'refreshed-dashboard-context',
      signature: `sha256=${'b'.repeat(64)}`,
      expiresAt: '2099-01-01T00:20:00Z',
    };
    const flaggedInbox = {
      channel_type: 'Channel::Api',
      custom_attributes: { praxis_bridge_send: true },
    };

    beforeEach(() => {
      originalAxios = global.axios;
      axiosMock = {
        get: vi.fn().mockResolvedValue({ data: signedContext }),
        post: vi.fn(),
      };
      global.axios = axiosMock;
    });

    afterEach(() => {
      global.axios = originalAxios;
    });

    it('routes a flagged public reply through the bridge without native send', async () => {
      axiosMock.post.mockResolvedValue({
        status: 201,
        data: { status: 'sent', flags: [] },
      });
      const { wrapper, store } = mountWith({
        inbox: flaggedInbox,
      });
      const dispatch = vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Geprüfte Antwort';

      await wrapper.vm.confirmOnSendReply();

      expect(axiosMock.get).toHaveBeenCalledWith(
        '/api/v1/accounts/1/praxis_bridge/context'
      );
      expect(axiosMock.post).toHaveBeenCalledWith(
        '/api/chatwoot/send',
        {
          actionId: expect.stringMatching(/^[a-zA-Z0-9_-]{8,128}$/),
          conversationId: 1,
          content: 'Geprüfte Antwort',
        },
        {
          headers: {
            'X-Chatwoot-Dashboard-Context': signedContext.context,
            'X-Chatwoot-Dashboard-Signature': signedContext.signature,
          },
        }
      );
      expect(dispatch).not.toHaveBeenCalledWith(
        'createPendingMessageAndSend',
        expect.anything()
      );
      expect(dispatch).not.toHaveBeenCalledWith(
        'addMessage',
        expect.anything()
      );
      expect(wrapper.vm.message).toBe('');
    });

    it('keeps the reply and shows every German block reason inline', async () => {
      axiosMock.post.mockRejectedValue({
        response: {
          status: 422,
          data: {
            error: 'send_blocked',
            flags: [
              { reason: 'Bitte keine Diagnose versprechen.' },
              { reason: 'Notfallhinweis ergänzen.' },
            ],
          },
        },
      });
      const { wrapper, store } = mountWith({
        inbox: flaggedInbox,
      });
      const dispatch = vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Ungeprüfte Antwort';

      await wrapper.vm.confirmOnSendReply();

      expect(dispatch).not.toHaveBeenCalledWith(
        'createPendingMessageAndSend',
        expect.anything()
      );
      expect(wrapper.vm.message).toBe('Ungeprüfte Antwort');
      expect(wrapper.get('[data-testid="praxis-bridge-error"]').text()).toBe(
        'Bitte keine Diagnose versprechen. Notfallhinweis ergänzen.'
      );
    });

    it('keeps private notes on the native message action', async () => {
      const { wrapper, store } = mountWith({
        inbox: flaggedInbox,
      });
      const dispatch = vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.replyType = REPLY_EDITOR_MODES.NOTE;
      wrapper.vm.message = 'Interne Notiz';

      await wrapper.vm.confirmOnSendReply();

      expect(axiosMock.post).not.toHaveBeenCalled();
      expect(axiosMock.get).not.toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith(
        'createPendingMessageAndSend',
        expect.objectContaining({ private: true, message: 'Interne Notiz' })
      );
    });

    it('keeps public replies native when the inbox flag is off', async () => {
      const { wrapper, store } = mountWith({
        inbox: { channel_type: 'Channel::Api', custom_attributes: {} },
      });
      const dispatch = vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Normale Antwort';

      await wrapper.vm.confirmOnSendReply();

      expect(axiosMock.post).not.toHaveBeenCalled();
      expect(axiosMock.get).not.toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith(
        'createPendingMessageAndSend',
        expect.objectContaining({ private: false, message: 'Normale Antwort' })
      );
    });

    it('reuses the action id when an unchanged reply is retried', async () => {
      axiosMock.post.mockRejectedValue(new Error('network unavailable'));
      const { wrapper, store } = mountWith({
        inbox: flaggedInbox,
      });
      vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Antwort mit stabilem Versuch';

      await wrapper.vm.confirmOnSendReply();
      await wrapper.vm.confirmOnSendReply();

      const firstActionId = axiosMock.post.mock.calls[0][1].actionId;
      expect(axiosMock.post.mock.calls[1][1].actionId).toBe(firstActionId);
      expect(axiosMock.get).toHaveBeenCalledTimes(1);
      expect(wrapper.vm.message).toBe('Antwort mit stabilem Versuch');
    });

    it('refetches context once on 401 and retries the same action id', async () => {
      axiosMock.get
        .mockResolvedValueOnce({ data: signedContext })
        .mockResolvedValueOnce({ data: refreshedContext });
      axiosMock.post
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({
          status: 201,
          data: { status: 'sent', flags: [] },
        });
      const { wrapper, store } = mountWith({ inbox: flaggedInbox });
      vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Antwort mit neuer Berechtigung';

      await wrapper.vm.confirmOnSendReply();

      expect(axiosMock.get).toHaveBeenCalledTimes(2);
      expect(axiosMock.post).toHaveBeenCalledTimes(2);
      expect(axiosMock.post.mock.calls[1][1].actionId).toBe(
        axiosMock.post.mock.calls[0][1].actionId
      );
      expect(axiosMock.post.mock.calls[1][2].headers).toEqual({
        'X-Chatwoot-Dashboard-Context': refreshedContext.context,
        'X-Chatwoot-Dashboard-Signature': refreshedContext.signature,
      });
      expect(wrapper.vm.message).toBe('');
    });

    it('shows the authorization error after the single 401 retry fails', async () => {
      axiosMock.get
        .mockResolvedValueOnce({ data: signedContext })
        .mockResolvedValueOnce({ data: refreshedContext });
      axiosMock.post.mockRejectedValue({ response: { status: 401 } });
      const { wrapper, store } = mountWith({ inbox: flaggedInbox });
      vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Antwort ohne Berechtigung';

      await wrapper.vm.confirmOnSendReply();

      expect(axiosMock.get).toHaveBeenCalledTimes(2);
      expect(axiosMock.post).toHaveBeenCalledTimes(2);
      expect(wrapper.vm.message).toBe('Antwort ohne Berechtigung');
      expect(wrapper.get('[data-testid="praxis-bridge-error"]').text()).toBe(
        'CONVERSATION.REPLYBOX.PRAXIS_BRIDGE.AUTH_EXPIRED'
      );
    });

    it('refreshes a cached context during its final minute', async () => {
      axiosMock.post.mockResolvedValue({
        status: 201,
        data: { status: 'sent', flags: [] },
      });
      const { wrapper, store } = mountWith({ inbox: flaggedInbox });
      vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.praxisBridgeContext = {
        ...signedContext,
        expiresAt: new Date(Date.now() + 30000).toISOString(),
      };
      wrapper.vm.message = 'Antwort nahe Ablauf';

      await wrapper.vm.confirmOnSendReply();

      expect(axiosMock.get).toHaveBeenCalledTimes(1);
      expect(axiosMock.post.mock.calls[0][2].headers).toEqual({
        'X-Chatwoot-Dashboard-Context': signedContext.context,
        'X-Chatwoot-Dashboard-Signature': signedContext.signature,
      });
    });

    it('does not clear a duplicate action with a non-sent outcome', async () => {
      axiosMock.post.mockResolvedValue({
        status: 200,
        data: { status: 'duplicate', outcome: 'blocked' },
      });
      const { wrapper, store } = mountWith({
        inbox: flaggedInbox,
      });
      vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Noch nicht gesendet';

      await wrapper.vm.confirmOnSendReply();

      expect(wrapper.vm.message).toBe('Noch nicht gesendet');
      expect(wrapper.get('[data-testid="praxis-bridge-error"]').text()).toBe(
        'CONVERSATION.REPLYBOX.PRAXIS_BRIDGE.NOT_SENT'
      );
    });

    it('clears a shadowed reply and shows the shadow-mode notice', async () => {
      axiosMock.post.mockResolvedValue({
        status: 201,
        data: { status: 'shadowed', flags: [] },
      });
      const { wrapper, store } = mountWith({ inbox: flaggedInbox });
      vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.message = 'Nur im Schattenmodus';

      await wrapper.vm.confirmOnSendReply();

      expect(wrapper.vm.message).toBe('');
      expect(wrapper.get('[data-testid="praxis-bridge-error"]').text()).toBe(
        'CONVERSATION.REPLYBOX.PRAXIS_BRIDGE.SHADOWED'
      );
    });

    it('blocks attachment sends instead of falling back to native send', async () => {
      const { wrapper, store } = mountWith({
        inbox: flaggedInbox,
      });
      const dispatch = vi.spyOn(store, 'dispatch').mockResolvedValue();
      wrapper.vm.attachedFiles = [
        { resource: { file: new File([], 'x.pdf') } },
      ];

      await wrapper.vm.confirmOnSendReply();

      expect(axiosMock.post).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalledWith(
        'createPendingMessageAndSend',
        expect.anything()
      );
      expect(wrapper.get('[data-testid="praxis-bridge-error"]').text()).toBe(
        'CONVERSATION.REPLYBOX.PRAXIS_BRIDGE.ATTACHMENTS_UNSUPPORTED'
      );
    });

    it('routes a scheduled payload through the shared bridge gate', async () => {
      axiosMock.post.mockResolvedValue({
        status: 201,
        data: { status: 'sent', flags: [] },
      });
      const { wrapper, store } = mountWith({ inbox: flaggedInbox });
      const dispatch = vi.spyOn(store, 'dispatch').mockResolvedValue();

      await wrapper.vm.sendMessage({
        message: 'Geplante Antwort',
        private: false,
        scheduled_at: '2099-01-01T10:00:00Z',
      });

      expect(axiosMock.post).toHaveBeenCalledTimes(1);
      expect(dispatch).not.toHaveBeenCalledWith(
        'createPendingMessageAndSend',
        expect.anything()
      );
    });
  });

  describe('Instagram incident restriction', () => {
    it('opens in note mode and restores only the private-note draft', async () => {
      const { wrapper, store } = mountWith({
        inbox: { channel_type: 'Channel::Instagram' },
        isMetaMessageSendingDisabled: true,
        drafts: {
          'draft-1-REPLY': 'unsent public reply',
          'draft-1-NOTE': 'incident note',
        },
      });
      await nextTick();

      expect(topPanel(wrapper).mode).toBe(REPLY_EDITOR_MODES.NOTE);
      expect(topPanel(wrapper).isReplyRestricted).toBe(true);
      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(true);
      expect(editor(wrapper).editorId).toBe('draft-1-NOTE');
      expect(wrapper.vm.message).toBe('incident note');
      expect(store.getters['draftMessages/getReplyEditorMode']).toBe(
        REPLY_EDITOR_MODES.NOTE
      );
      expect(store.getters['draftMessages/get']('draft-1-REPLY')).toBe(
        'unsent public reply'
      );
    });

    it('preserves draft ownership when switching to a restricted conversation', async () => {
      const drafts = {
        'draft-1-REPLY': 'conversation A reply',
        'draft-1-NOTE': 'conversation A note',
        'draft-2-REPLY': 'conversation B reply',
        'draft-2-NOTE': 'conversation B note',
      };
      const { wrapper, store } = mountWith({
        inbox: { channel_type: 'Channel::WebWidget' },
        inboxes: {
          1: { channel_type: 'Channel::WebWidget' },
          2: { channel_type: 'Channel::Instagram' },
        },
        drafts,
        isMetaMessageSendingDisabled: true,
      });
      await nextTick();

      store.commit('selectChat', { ...REPLIABLE, id: 2, inbox_id: 2 });
      await nextTick();

      expect(editor(wrapper)).toMatchObject({
        editorId: 'draft-2-NOTE',
        modelValue: 'conversation B note',
      });
      Object.entries(drafts).forEach(([key, message]) => {
        expect(store.getters['draftMessages/get'](key)).toBe(message);
      });
    });
  });

  describe.each(CHANNELS)('$name', ({ name, inbox }) => {
    it('locks the composer and hides template sends when a bot owns a pending conversation', () => {
      const { wrapper } = mountWith({
        inbox,
        chat: {
          status: 'pending',
          meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
        },
      });

      expect(topPanel(wrapper).isReplyRestricted).toBe(true);
      expect(bottomPanel(wrapper).enableWhatsAppTemplates).toBe(false);
      expect(bottomPanel(wrapper).enableContentTemplates).toBe(false);
      // The note composer stays usable — this is a restriction, not a lockout.
      expect(topPanel(wrapper).isEditorDisabled).toBe(false);
    });

    it('opens directly in note mode when a bot already owns the pending conversation', () => {
      const { wrapper, store } = mountWith({
        inbox,
        chat: {
          can_reply: false,
          status: 'pending',
          meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
        },
      });

      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(true);
      expect(store.getters['draftMessages/getReplyEditorMode']).toBe(
        REPLY_EDITOR_MODES.NOTE
      );
      expect(topPanel(wrapper).isEditorDisabled).toBe(false);
    });

    it('opens in reply mode for every other conversation', () => {
      const { wrapper, store } = mountWith({ inbox });

      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(false);
      expect(store.getters['draftMessages/getReplyEditorMode']).toBe(
        REPLY_EDITOR_MODES.REPLY
      );
    });

    it.each(['open', 'resolved', 'snoozed'])(
      'leaves the composer open when a bot owns a %s conversation',
      status => {
        const { wrapper } = mountWith({
          inbox,
          chat: {
            status,
            meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
          },
        });

        expect(topPanel(wrapper).isReplyRestricted).toBe(false);
        expect(bottomPanel(wrapper).enableWhatsAppTemplates).toBe(true);
      }
    );

    it('leaves the composer open when a human owns a pending conversation', () => {
      const { wrapper } = mountWith({
        inbox,
        chat: {
          status: 'pending',
          meta: { sender: { id: 2 }, assignee_type: 'User' },
        },
      });

      expect(topPanel(wrapper).isReplyRestricted).toBe(false);
      expect(bottomPanel(wrapper).enableWhatsAppTemplates).toBe(true);
    });

    it('matches the existing messaging-window rule when no bot is involved', () => {
      const { wrapper } = mountWith({
        inbox,
        chat: { can_reply: false, status: 'resolved' },
      });

      const stillRepliable = exemptFromMessagingWindow(name);
      expect(topPanel(wrapper).isReplyRestricted).toBe(!stillRepliable);
      expect(bottomPanel(wrapper).enableWhatsAppTemplates).toBe(stillRepliable);
      // WhatsApp/API disable the editor and steer to templates; everywhere
      // else the composer falls back to a usable private note.
      expect(topPanel(wrapper).isEditorDisabled).toBe(stillRepliable);
    });
  });

  it('hides the template action when the inbox has no templates synced', () => {
    const { wrapper } = mountWith({
      inbox: { channel_type: 'Channel::Whatsapp' },
      chat: { can_reply: false, status: 'open' },
      templates: [],
    });

    expect(bottomPanel(wrapper).enableWhatsAppTemplates).toBe(false);
    expect(topPanel(wrapper).isReplyRestricted).toBe(false);
  });

  describe('drafts', () => {
    const DRAFTS = {
      'draft-1-REPLY': 'half typed reply',
      'draft-1-NOTE': 'a note',
    };

    it('loads the note draft while a bot owns the conversation', async () => {
      const { wrapper } = mountWith({
        inbox: { channel_type: 'Channel::WebWidget' },
        chat: {
          status: 'pending',
          meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
        },
        drafts: DRAFTS,
      });
      await nextTick();

      expect(editor(wrapper)).toMatchObject({
        editorId: 'draft-1-NOTE',
        modelValue: 'a note',
      });
    });

    it('leaves the saved reply draft intact and restores it on takeover', async () => {
      const { wrapper, store } = mountWith({
        inbox: { channel_type: 'Channel::WebWidget' },
        chat: {
          status: 'pending',
          meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
        },
        drafts: DRAFTS,
      });
      await nextTick();
      expect(store.getters['draftMessages/get']('draft-1-REPLY')).toBe(
        'half typed reply'
      );

      store.commit('selectChat', {
        ...REPLIABLE,
        status: 'open',
        meta: { sender: { id: 2 }, assignee_type: 'User' },
      });
      await nextTick();

      expect(editor(wrapper)).toMatchObject({
        editorId: 'draft-1-REPLY',
        modelValue: 'half typed reply',
      });
    });
  });

  it('offers content templates on Twilio WhatsApp when no bot owns the conversation', () => {
    const { wrapper } = mountWith({
      inbox: { channel_type: 'Channel::TwilioSms', medium: 'whatsapp' },
      chat: { can_reply: true, status: 'open' },
    });

    expect(bottomPanel(wrapper).enableContentTemplates).toBe(true);
  });

  describe('on selecting a conversation', () => {
    const selectChat = async chat => {
      const { wrapper, store } = mountWith({
        inbox: { channel_type: 'Channel::WebWidget' },
      });
      store.commit('selectChat', { ...REPLIABLE, id: 99, ...chat });
      await nextTick();
      return { wrapper, store };
    };

    it('switches to note mode when a bot owns a pending conversation', async () => {
      const { wrapper } = await selectChat({
        status: 'pending',
        meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
      });

      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(true);
    });

    it('stays in reply mode when a human owns a pending conversation', async () => {
      const { wrapper } = await selectChat({
        status: 'pending',
        meta: { sender: { id: 2 }, assignee_type: 'User' },
      });

      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(false);
    });

    it('closes an open template modal when a bot takes over the conversation', async () => {
      const { wrapper, store } = mountWith({
        inbox: { channel_type: 'Channel::Whatsapp' },
      });
      wrapper
        .findComponent({ name: 'ReplyBottomPanel' })
        .vm.$emit('selectWhatsappTemplate');
      await nextTick();
      expect(wrapper.findComponent(WhatsappTemplates).props('show')).toBe(true);

      store.commit('selectChat', {
        ...REPLIABLE,
        status: 'pending',
        meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
      });
      await nextTick();

      expect(wrapper.findComponent(WhatsappTemplates).props('show')).toBe(
        false
      );
    });

    it('returns to reply mode once the agent takes over', async () => {
      const { wrapper, store } = await selectChat({
        status: 'pending',
        meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
      });
      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(true);

      store.commit('selectChat', {
        ...REPLIABLE,
        id: 99,
        status: 'open',
        meta: { sender: { id: 2 }, assignee_type: 'User' },
      });
      await nextTick();

      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(false);
      expect(topPanel(wrapper).isReplyRestricted).toBe(false);
      expect(store.getters['draftMessages/getReplyEditorMode']).toBe(
        REPLY_EDITOR_MODES.REPLY
      );
    });

    it('keeps the agent in note mode after they chose it themselves', async () => {
      const { wrapper } = await selectChat({});
      wrapper
        .findComponent({ name: 'ReplyTopPanel' })
        .vm.$emit('setReplyMode', REPLY_EDITOR_MODES.NOTE);
      await nextTick();

      expect(bottomPanel(wrapper).isOnPrivateNote).toBe(true);
    });

    it('mirrors the forced note mode into the draftMessages store', async () => {
      const { store } = await selectChat({
        status: 'pending',
        meta: { sender: { id: 2 }, assignee_type: 'AgentBot' },
      });

      expect(store.getters['draftMessages/getReplyEditorMode']).toBe(
        REPLY_EDITOR_MODES.NOTE
      );
    });
  });
});
