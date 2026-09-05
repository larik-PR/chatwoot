/* global axios */

const PRAXIS_BRIDGE_SEND_URL = '/api/chatwoot/send';

export const sendPraxisBridgeMessage = ({
  actionId,
  conversationId,
  content,
  signedContext,
}) =>
  axios.post(
    PRAXIS_BRIDGE_SEND_URL,
    { actionId, conversationId, content, signedContext },
    {
      headers: {
        'X-Chatwoot-Dashboard-Context': signedContext?.context,
        'X-Chatwoot-Dashboard-Signature': signedContext?.signature,
      },
    }
  );

export const getPraxisBridgeErrorMessage = error => {
  const { data = {}, status } = error?.response || {};
  const reasons = Array.isArray(data.flags)
    ? data.flags.map(flag => flag?.reason).filter(Boolean)
    : [];

  if (reasons.length) return reasons.join(' ');
  if (status === 401) {
    return 'Die Berechtigung ist abgelaufen. Bitte laden Sie die Ansicht neu.';
  }
  if (data.error === 'send_outcome_uncertain') {
    return 'Versandstatus unklar. Bitte prüfen Sie den Chat vor einem erneuten Senden.';
  }
  return 'Die Nachricht wurde nicht gesendet. Bitte prüfen Sie die Verbindung und versuchen Sie es erneut.';
};
