import { BACKEND } from '../config'
import { useLocalTickets } from './useTickets'
import { useApiTickets } from './useApiTickets'

// Pick the ticket store at module load from the build-time backend flag.
// (Firebase mode is parked — its hook lives in useFirebaseTickets.js and is
// intentionally not imported here so the Firebase SDK stays out of the bundle.)
export const useTicketStore = BACKEND === 'api' ? useApiTickets : useLocalTickets
