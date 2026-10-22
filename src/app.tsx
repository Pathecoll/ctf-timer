import { type FormEvent, useEffect, useState } from "react"
import { Scene } from "./scene"
import { formatClock, MINUTE, parseDuration, type TimerStatus } from "./timer"
import { useIdle, useNameGlitch } from "./use-hud"
import { useTimer } from "./use-timer"

const PRESETS = [5, 10, 15, 30, 45, 60]

const STATUS: Record<TimerStatus, string> = {
  idle: "Standby",
  running: "Live",
  paused: "Paused",
  done: "Time's up",
}

/** "sAIde" with the AI highlighted, glitching now and then into the plain word, as in the CTF. */
function Wordmark() {
  const glitching = useNameGlitch()
  return (
    <p className="wordmark">
      The other{" "}
      <span className={`saide ${glitching ? "is-glitching" : ""}`}>
        <span className="sr-only">side</span>
        <span className="saide-ai" aria-hidden="true">
          s<b>AI</b>de
        </span>
        <span className="saide-plain" aria-hidden="true">
          side
        </span>
      </span>
    </p>
  )
}

function LocalTime() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <time className="local-time" dateTime={now.toISOString()}>
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </time>
  )
}

export function App() {
  const { state, left, tone, dispatch } = useTimer()
  const [custom, setCustom] = useState("")
  const running = state.status === "running"
  const idle = useIdle(3000) && running

  const withHours = state.durationMs >= 60 * MINUTE || left >= 60 * MINUTE
  const text = formatClock(left, withHours)
  const progress = state.durationMs > 0 ? Math.min(1, left / state.durationMs) : 0

  const toggle = () => dispatch({ type: running ? "pause" : "start" })
  const fullScreen = () =>
    document.fullscreenElement
      ? void document.exitFullscreen()
      : void document.documentElement.requestFullscreen().catch(() => undefined)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return
      const key = event.key.toLowerCase()
      if (key === " ") dispatch({ type: running ? "pause" : "start" })
      else if (key === "r") dispatch({ type: "reset" })
      else if (key === "f") fullScreen()
      else if (key === "arrowup") dispatch({ type: "add", ms: MINUTE })
      else if (key === "arrowdown") dispatch({ type: "add", ms: -MINUTE })
      else return
      event.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const setCustomTime = (event: FormEvent) => {
    event.preventDefault()
    const ms = parseDuration(custom)
    if (ms === null) return
    dispatch({ type: "set", durationMs: ms })
    setCustom("")
  }

  return (
    <div className="app" data-tone={tone} data-status={state.status} data-idle={idle}>
      <Scene
        text={text}
        tone={tone}
        dim={state.status === "paused"}
        blink={!running || left % 1000 >= 500}
      />
      <div className="noise" aria-hidden="true" />

      <header className="top">
        <div className="brand">
          <Wordmark />
          <p className="eyebrow">[ ctOS · countdown ]</p>
        </div>
        <div className="top-right">
          <span className={`chip chip--${state.status}`}>
            <i aria-hidden="true" />
            {STATUS[state.status]}
          </span>
          <LocalTime />
        </div>
      </header>

      <div className="label">
        {state.status === "done" ? (
          <p className="times-up" aria-live="assertive">
            Time's up
          </p>
        ) : (
          <input
            aria-label="Timer label"
            value={state.label}
            maxLength={60}
            spellCheck={false}
            onChange={(event) => dispatch({ type: "label", label: event.target.value })}
          />
        )}
      </div>

      <p className="sr-only" role="timer">
        {text}
      </p>

      <div className="progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <footer className="dock">
        <div className="dock-row">
          <button type="button" className="btn btn--primary" onClick={toggle}>
            {running ? "Pause" : state.status === "paused" ? "Resume" : "Start"}
          </button>
          <button type="button" className="btn" onClick={() => dispatch({ type: "reset" })}>
            Reset
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: "add", ms: -MINUTE })}
          >
            −1 min
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => dispatch({ type: "add", ms: MINUTE })}
          >
            +1 min
          </button>
          <button type="button" className="btn" onClick={fullScreen}>
            Full screen
          </button>
        </div>
        <div className="dock-row">
          {PRESETS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`btn btn--preset ${state.durationMs === minutes * MINUTE ? "is-on" : ""}`}
              onClick={() => dispatch({ type: "set", durationMs: minutes * MINUTE })}
            >
              {minutes}m
            </button>
          ))}
          <form className="custom" onSubmit={setCustomTime}>
            <input
              aria-label="Custom time: minutes, m:ss or h:mm:ss"
              placeholder="m:ss"
              value={custom}
              inputMode="numeric"
              onChange={(event) => setCustom(event.target.value)}
              aria-invalid={custom !== "" && parseDuration(custom) === null}
            />
            <button type="submit" className="btn" disabled={parseDuration(custom) === null}>
              Set
            </button>
          </form>
        </div>
        <p className="keys">Space start/pause · R reset · ↑ ↓ ±1 min · F full screen</p>
      </footer>
    </div>
  )
}
