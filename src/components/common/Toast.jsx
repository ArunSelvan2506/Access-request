import { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react'

const ToastContext = createContext(() => {})

// useToast() returns a `toast(message, type)` function.
// type: "good" | "bad" | undefined
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [state, setState] = useState({ msg: '', type: '', show: false })
  const timer = useRef(null)

  const toast = useCallback((msg, type = '') => {
    setState({ msg, type, show: true })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState((s) => ({ ...s, show: false })), 2600)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={'toast ' + (state.show ? 'show ' : '') + state.type}>{state.msg}</div>
    </ToastContext.Provider>
  )
}
