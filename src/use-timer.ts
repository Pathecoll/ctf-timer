import { useCallback, useEffect, useState } from "react"
import { loadState, remaining, saveState, type TimerAction, type TimerState, update } from "./timer"

/** How urgent the clock looks: colour, pulse and glitch follow this. */
export type Tone = "calm" | "warn" | "final" | "done"

const toneOf = (state: TimerState, left: number): Tone =>
  state.status === "done" ? "done" : left <= 10_000 ? "final" : left <= 60_000 ? "warn" : "calm"

/**
 * The timer, ticking ten times a second while it runs. Saved on every change,
 * and kept in step with other tabs on this computer: run the controls on a
 * laptop tab and the big clock in another, full screen on the projector.
 */
export function useTimer() {
  const [state, setState] = useState(() => loadState(window.location.search))
  const [now, setNow] = useState(Date.now)

  const dispatch = useCallback(
    (action: TimerAction) => setState((current) => update(current, action, Date.now())),
    [],
  )

  useEffect(() => saveState(state), [state])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "ctf-timer:state") setState(loadState(""))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    setNow(Date.now())
    if (state.status !== "running") return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [state])

  const left = remaining(state, now)
  useEffect(() => {
    if (state.status === "running" && left === 0) dispatch({ type: "finish" })
  }, [state.status, left, dispatch])

  return { state, left, now, tone: toneOf(state, left), dispatch }
}
