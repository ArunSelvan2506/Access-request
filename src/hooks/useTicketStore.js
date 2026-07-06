import { BACKEND } from '../config'
import { useLocalTickets } from './useTickets'
import { useApiTickets } from './useApiTickets'

// Pick the ticket store at module load from the build-time backend flag.
export const useTicketStore = BACKEND === 'api' ? useApiTickets : useLocalTickets
