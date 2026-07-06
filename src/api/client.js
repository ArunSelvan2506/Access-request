import { API_BASE, API_KEY } from '../config'

async function req(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}), ...(opts.headers || {}) },
  })
  if (!res.ok) throw new Error('API ' + res.status + ' ' + path)
  return res.status === 204 ? null : res.json()
}

// Ticket REST client for the DynamoDB-backed server.
export const listTickets = () => req('/api/tickets')
export const createTicketApi = (ticket) => req('/api/tickets', { method: 'POST', body: JSON.stringify(ticket) })
export const saveTicketApi = (key, ticket) =>
  req('/api/tickets/' + encodeURIComponent(key), { method: 'PUT', body: JSON.stringify(ticket) })
