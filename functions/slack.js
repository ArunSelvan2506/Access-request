// Posts notifications to Slack via an Incoming Webhook. The webhook URL is a
// secret (set with: firebase functions:secrets:set SLACK_WEBHOOK_URL) and never
// ships to the browser — which is why Slack notifications must run server-side.
async function notifySlack(webhookUrl, text) {
  if (!webhookUrl || !text) return
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (e) {
    // Don't let a Slack hiccup fail the ticket write.
    console.error('Slack notify failed:', e)
  }
}

// Builds the message for a ticket event.
function ticketMessage({ before, after, created, deleted }) {
  if (deleted || !after) return null
  if (created) {
    return `🆕 *New access request* — ${after.key}: ${after.summary} (${after.app}) · Urgency ${after.urgency || '—'} · by ${after.requester || 'unknown'}`
  }
  if (before && before.status !== after.status) {
    let extra = ''
    if (after.status === 'Waiting' && after.pendingReason) extra = ` (${after.pendingReason})`
    if (after.status === 'Rejected' && after.rejectReason) extra = ` — ${after.rejectReason}`
    return `🔄 *${after.key}* → ${after.status}${extra}  ·  ${after.app}`
  }
  return null
}

module.exports = { notifySlack, ticketMessage }
