/*
 * The countdown, as plain data. A running timer stores when it ends, not how
 * much is left, so it never drifts and a reload picks up exactly where it was.
 */

export type TimerStatus = "idle" | "running" | "paused" | "done"

export interface TimerState {
  readonly status: TimerStatus
  /** What the timer is set to; reset goes back to this. */
  readonly durationMs: number
  /** When a running timer reaches zero (epoch ms). */
  readonly endsAt: number | null
  /** What is left while idle or paused. */
  readonly leftMs: number
  readonly label: string
}

export const MINUTE = 60_000
export const MAX_MS = 24 * 60 * MINUTE

const clampMs = (ms: number) => Math.min(MAX_MS, Math.max(0, Math.round(ms)))

export const initialState = (durationMs = 15 * MINUTE, label = "Time remaining"): TimerState => ({
  status: "idle",
  durationMs: clampMs(durationMs),
  endsAt: null,
  leftMs: clampMs(durationMs),
  label,
})

export const remaining = (state: TimerState, now: number) =>
  state.status === "running" && state.endsAt !== null
    ? Math.max(0, state.endsAt - now)
    : state.leftMs

export type TimerAction =
  | { readonly type: "start" }
  | { readonly type: "pause" }
  | { readonly type: "reset" }
  | { readonly type: "finish" }
  | { readonly type: "set"; readonly durationMs: number }
  | { readonly type: "add"; readonly ms: number }
  | { readonly type: "label"; readonly label: string }

export function update(state: TimerState, action: TimerAction, now: number): TimerState {
  const left = remaining(state, now)
  switch (action.type) {
    case "start":
      // Starting at zero runs the whole time again.
      return {
        ...state,
        status: "running",
        endsAt: now + (left > 0 ? left : state.durationMs),
      }
    case "pause":
      return state.status === "running"
        ? { ...state, status: "paused", endsAt: null, leftMs: left }
        : state
    case "reset":
      return { ...state, status: "idle", endsAt: null, leftMs: state.durationMs }
    case "finish":
      return { ...state, status: "done", endsAt: null, leftMs: 0 }
    case "set":
      return { ...initialState(action.durationMs, state.label) }
    case "add": {
      const next = clampMs(left + action.ms)
      if (state.status === "running") return { ...state, endsAt: now + next }
      // Adding time to a finished timer leaves it paused with that time on it.
      return { ...state, status: state.status === "done" ? "paused" : state.status, leftMs: next }
    }
    case "label":
      return { ...state, label: action.label }
  }
}

/** Seconds are rounded up, so a fresh 15:00 shows 15:00 and 00:00 only appears at the end. */
export function formatClock(ms: number, withHours: boolean) {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const two = (n: number) => String(n).padStart(2, "0")
  return withHours ? `${h}:${two(m)}:${two(s)}` : `${two(m + h * 60)}:${two(s)}`
}

/** "15" is minutes; "4:30" is minutes and seconds; "1:30:00" adds hours. */
export function parseDuration(input: string): number | null {
  const parts = input.trim().split(":")
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null
  const [a = 0, b, c] = parts.map(Number)
  const ms =
    parts.length === 1
      ? a * MINUTE
      : parts.length === 2
        ? a * MINUTE + (b ?? 0) * 1000
        : a * 60 * MINUTE + (b ?? 0) * MINUTE + (c ?? 0) * 1000
  return ms > 0 && ms <= MAX_MS ? ms : null
}

const STORAGE_KEY = "ctf-timer:state"

const isState = (value: unknown): value is TimerState => {
  const v = value as TimerState | null
  return (
    typeof v === "object" &&
    v !== null &&
    ["idle", "running", "paused", "done"].includes(v.status) &&
    typeof v.durationMs === "number" &&
    typeof v.leftMs === "number" &&
    typeof v.label === "string" &&
    (v.endsAt === null || typeof v.endsAt === "number")
  )
}

/**
 * The timer to start with: a link like `?t=10&label=Round%201` sets it up;
 * otherwise the one this browser had open, still running if it was.
 */
export function loadState(search: string): TimerState {
  const params = new URLSearchParams(search)
  const fromLink = parseDuration(params.get("t") ?? "")
  if (fromLink !== null) return initialState(fromLink, params.get("label") ?? undefined)
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    if (isState(saved)) return saved
  } catch {
    // Nothing saved, or storage is blocked.
  }
  return initialState(undefined, params.get("label") ?? undefined)
}

export function saveState(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage blocked: the timer still works, it just won't survive a reload.
  }
}
