import { useEffect, useState } from "react"

/** True for a moment every few seconds, for the wordmark's glitch. */
export function useNameGlitch() {
  const [glitching, setGlitching] = useState(false)
  useEffect(() => {
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setGlitching(true)
          timer = window.setTimeout(() => {
            setGlitching(false)
            schedule()
          }, 180)
        },
        4000 + Math.random() * 5000,
      )
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])
  return glitching
}

/** True once the pointer and keyboard have been still for `ms`; the controls hide then. */
export function useIdle(ms: number) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), ms)
    const wake = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), ms)
    }
    const events = ["pointermove", "pointerdown", "keydown"] as const
    for (const name of events) window.addEventListener(name, wake)
    return () => {
      window.clearTimeout(timer)
      for (const name of events) window.removeEventListener(name, wake)
    }
  }, [ms])
  return idle
}
