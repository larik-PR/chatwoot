/* global axios */

const PRAXIS_BRIDGE_SEND_URL = '/api/chatwoot/send';
const praxisBridgeContextUrl = accountId =>
  `/api/v1/accounts/${accountId}/praxis_bridge/context`;

export const fetchPraxisBridgeContext = accountId =>
  axios.get(praxisBridgeContextUrl(accountId));

export const sendPraxisBridgeMessage = ({
  actionId,
  conversationId,
  content,
  signedContext,
}) =>
  axios.post(
    PRAXIS_BRIDGE_SEND_URL,
    { actionId, conversationId, content },
    {
      headers: {
        'X-Chatwoot-Dashboard-Context': signedContext?.context,
        'X-Chatwoot-Dashboard-Signature': signedContext?.signature,
      },
    }
  );

export const getPraxisBridgeErrorMessage = (error, messages) => {
  const { data = {}, status } = error?.response || {};
  const reasons = Array.isArray(data.flags)
    ? data.flags.map(flag => flag?.reason).filter(Boolean)
    : [];

  if (reasons.length) return reasons.join(' ');
  if (status === 401) {
    return messages.authExpired;
  }
  if (data.error === 'send_outcome_uncertain') {
    return messages.outcomeUncertain;
  }
  return messages.sendFailed;
};
