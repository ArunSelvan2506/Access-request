import { isFirebase } from '../config'
import { useLocalTickets } from './useTickets'
import { useFirebaseTickets } from './useFirebaseTickets'

// Picks the ticket store at module load based on the build-time backend flag.
// Assigning the hook (rather than calling it conditionally) keeps this
// rules-of-hooks compliant — the choice never changes during a session.
export const useTicketStore = isFirebase ? useFirebaseTickets : useLocalTickets
