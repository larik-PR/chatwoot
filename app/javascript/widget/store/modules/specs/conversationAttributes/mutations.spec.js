import { mutations } from '../../conversationAttributes';

describe('#mutations', () => {
  describe('#SET_CONVERSATION_ATTRIBUTES', () => {
    it('set status of the conversation', () => {
      const state = { id: '', status: '', agentLastSeenAt: 0 };
      mutations.SET_CONVERSATION_ATTRIBUTES(state, {
        id: 1,
        status: 'open',
        agent_last_seen_at: 1_788_667_260,
      });
      expect(state).toEqual({
        id: 1,
        status: 'open',
        agentLastSeenAt: 1_788_667_260,
      });
    });
  });

  describe('#UPDATE_CONVERSATION_ATTRIBUTES', () => {
    it('update status if it is same conversation', () => {
      const state = { id: 1, status: 'pending', agentLastSeenAt: 0 };
      mutations.UPDATE_CONVERSATION_ATTRIBUTES(state, {
        id: 1,
        status: 'open',
        agent_last_seen_at: 1_788_667_260,
      });
      expect(state).toEqual({
        id: 1,
        status: 'open',
        agentLastSeenAt: 1_788_667_260,
      });
    });
    it('doesnot update status if it is not the same conversation', () => {
      const state = { id: 1, status: 'pending', agentLastSeenAt: 0 };
      mutations.UPDATE_CONVERSATION_ATTRIBUTES(state, {
        id: 2,
        status: 'open',
      });
      expect(state).toEqual({ id: 1, status: 'pending', agentLastSeenAt: 0 });
    });
  });

  describe('#CLEAR_CONVERSATION_ATTRIBUTES', () => {
    it('clear status if it is same conversation', () => {
      const state = { id: 1, status: 'open', agentLastSeenAt: 1_788_667_260 };
      mutations.CLEAR_CONVERSATION_ATTRIBUTES(state, {
        id: 1,
        status: 'open',
      });
      expect(state).toEqual({ id: '', status: '', agentLastSeenAt: 0 });
    });
  });
});
