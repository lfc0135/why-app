"use client"

import { useEffect, useRef, useState } from "react"
import { Board } from "@/components/board"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DISCLAIMER, DOMAINS, FEATURED_QUESTIONS, domainLabel } from "@/lib/why/content"
import { CACHE_SCORE, buildTranscript, matchSeed } from "@/lib/why/match"
import { seeds } from "@/lib/why/seeds"
import type { Scene } from "@/lib/why/schema"
import {
  canSpeak,
  pauseSpeech,
  resumeSpeech,
  silence,
  speakBrowser,
  speakServer,
  unlockSpeech,
} from "@/lib/speech"

type Status = "idle" | "loading" | "playing" | "paused" | "done" | "error"

type Session = {
  question: string
  title: string
  domain: string
  jurisdictionNote?: string
  followUps: string[]
  fromCache: boolean
  askedAt: number
  error?: string
  suggestions: string[]
}

export function WhyApp() {
  const [question, setQuestion] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [session, setSession] = useState<Session | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [index, setIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [ttff, setTtff] = useState<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [spoken, setSpoken] = useState(0)
  const [serverTts, setServerTts] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [voiceReady, setVoiceReady] = useState(true)

  const runRef = useRef(0)
  const mutedRef = useRef(false)
  const pausedRef = useRef(false)
  const scenesRef = useRef<Scene[]>([])
  const completeRef = useRef(false)
  const failedRef = useRef(false)
  const ttsRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const prime = () => {
      if (!canSpeak()) setVoiceReady(false)
      else window.speechSynthesis.getVoices()
    }
    const id = window.setTimeout(prime, 0)
    if (!canSpeak()) return () => window.clearTimeout(id)
    window.speechSynthesis.addEventListener("voiceschanged", prime)
    return () => {
      window.clearTimeout(id)
      window.speechSynthesis.removeEventListener("voiceschanged", prime)
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((data: { tts?: boolean }) => {
        ttsRef.current = Boolean(data.tts)
        setServerTts(Boolean(data.tts))
      })
      .catch(() => {
        ttsRef.current = false
        setServerTts(false)
      })
  }, [])

  function stopAudio() {
    audioRef.current?.pause()
    audioRef.current = null
    silence()
  }

  function ask(raw: string) {
    const next = raw.trim().replace(/\s+/g, " ")
    if (!next) return
    runRef.current += 1
    const runId = runRef.current
    abortRef.current?.abort()
    stopAudio()
    unlockSpeech()
    pausedRef.current = false
    failedRef.current = false
    completeRef.current = false
    setQuestion(next)
    setIndex(0)
    setElapsed(0)
    setSpoken(0)
    setTtff(null)

    const askedAt = clock()
    const hit = matchSeed(next)
    if (hit && hit.score >= CACHE_SCORE) {
      scenesRef.current = hit.plan.scenes
      completeRef.current = true
      setScenes(hit.plan.scenes)
      setSession({
        question: next,
        title: hit.plan.title,
        domain: hit.plan.domain,
        jurisdictionNote: hit.plan.jurisdictionNote,
        followUps: hit.plan.followUps,
        fromCache: true,
        askedAt,
        suggestions: [],
      })
      setStatus("playing")
      void play(runId, askedAt)
      return
    }

    scenesRef.current = []
    setScenes([])
    setSession({
      question: next,
      title: "Sketching",
      domain: "general",
      followUps: [],
      fromCache: false,
      askedAt,
      suggestions: [],
    })
    setStatus("loading")
    void play(runId, askedAt)
    void streamQuestion(next, runId)
  }

  async function streamQuestion(next: string, runId: number) {
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: next }),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) throw new Error("explain")
      for await (const item of readSse(response)) {
        if (runRef.current !== runId) return
        if (item.event === "meta") {
          const data = item.data as Session
          setSession((current) =>
            current
              ? {
                  ...current,
                  title: data.title,
                  domain: data.domain,
                  jurisdictionNote: data.jurisdictionNote,
                  fromCache: Boolean(data.fromCache),
                }
              : current,
          )
        } else if (item.event === "scene") {
          const data = item.data as Scene
          scenesRef.current = [...scenesRef.current, data]
          setScenes(scenesRef.current)
          setStatus((current) => (current === "loading" ? "playing" : current))
        } else if (item.event === "done") {
          const data = item.data as {
            followUps: string[]
            jurisdictionNote?: string
          }
          completeRef.current = true
          setSession((current) =>
            current
              ? {
                  ...current,
                  followUps: data.followUps,
                  jurisdictionNote: data.jurisdictionNote ?? current.jurisdictionNote,
                }
              : current,
          )
        } else if (item.event === "error") {
          const data = item.data as { message: string; suggestions: string[] }
          failedRef.current = true
          completeRef.current = true
          setSession((current) =>
            current ? { ...current, error: data.message, suggestions: data.suggestions, followUps: [] } : current,
          )
          setStatus("error")
        }
      }
      if (runRef.current === runId && !failedRef.current) completeRef.current = true
    } catch {
      if (controller.signal.aborted || runRef.current !== runId) return
      failedRef.current = true
      completeRef.current = true
      setSession((current) =>
        current
          ? {
              ...current,
              error: "The board could not load that explainer.",
              suggestions: FEATURED_QUESTIONS.slice(0, 3),
            }
          : current,
      )
      setStatus("error")
    }
  }

  async function play(runId: number, askedAt: number) {
    let cursor = 0
    let marked = false
    while (runRef.current === runId && !failedRef.current) {
      const scene = await waitForScene(cursor, runId)
      if (!scene || runRef.current !== runId) {
        if (completeRef.current && cursor > 0) setStatus("done")
        return
      }
      setIndex(cursor)
      setSpoken(0)
      if (!pausedRef.current) setStatus("playing")
      if (!marked) {
        marked = true
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (runRef.current === runId) setTtff(Math.round(clock() - askedAt))
          })
        })
      }
      const visual = waitMs(scene.durationMs, runId, (value) => {
        if (runRef.current === runId) setElapsed(value)
      })
      const voice = speakScene(scene.narration, runId)
      await Promise.all([visual, voice])
      if (runRef.current !== runId) return
      cursor += 1
      if (cursor >= scenesRef.current.length && completeRef.current) {
        setElapsed(scene.durationMs)
        setStatus("done")
        return
      }
    }
  }

  function speakScene(narration: string, runId: number): Promise<void> {
    if (mutedRef.current) return Promise.resolve()
    return (async () => {
      if (ttsRef.current) {
        try {
          await speakServer(narration, audioRef)
          return
        } catch {
          // The browser voice still carries the scene.
        }
      }
      if (mutedRef.current || runRef.current !== runId) return
      await speakBrowser(narration, (charIndex) => {
        if (runRef.current === runId) setSpoken(charIndex)
      })
    })()
  }

  function waitForScene(cursor: number, runId: number): Promise<Scene | null> {
    if (runRef.current !== runId || failedRef.current) return Promise.resolve(null)
    if (scenesRef.current[cursor]) return Promise.resolve(scenesRef.current[cursor])
    if (completeRef.current) return Promise.resolve(null)
    return new Promise((resolve) => {
      const check = () => {
        if (runRef.current !== runId || failedRef.current) return resolve(null)
        if (scenesRef.current[cursor]) return resolve(scenesRef.current[cursor])
        if (completeRef.current) return resolve(scenesRef.current[cursor] ?? null)
        requestAnimationFrame(check)
      }
      requestAnimationFrame(check)
    })
  }

  function waitMs(ms: number, runId: number, onElapsed: (value: number) => void) {
    return new Promise<void>((resolve) => {
      const started = clock()
      let pausedFor = 0
      let pauseMark = 0
      const timer = window.setInterval(() => {
        if (runRef.current !== runId) {
          window.clearInterval(timer)
          resolve()
          return
        }
        const now = clock()
        if (pausedRef.current) {
          if (!pauseMark) pauseMark = now
        } else if (pauseMark) {
          pausedFor += now - pauseMark
          pauseMark = 0
        }
        const held = pauseMark ? now - pauseMark : 0
        const elapsed = Math.max(0, now - started - pausedFor - held)
        onElapsed(Math.min(ms, elapsed))
        if (elapsed >= ms) {
          window.clearInterval(timer)
          resolve()
        }
      }, 40)
    })
  }

  function togglePause() {
    if (status !== "playing" && status !== "paused") return
    const next = !pausedRef.current
    pausedRef.current = next
    setStatus(next ? "paused" : "playing")
    if (next) {
      pauseSpeech()
      audioRef.current?.pause()
    } else {
      resumeSpeech()
      void audioRef.current?.play().catch(() => undefined)
    }
  }

  function toggleMute() {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (next) stopAudio()
  }

  const scene = scenes[index] ?? null
  const caption =
    scene?.caption ??
    (status === "loading" ? "Sketching the first strokes…" : "Captions sit here while the chalk moves.")
  const followUps = session?.error ? session.suggestions : (session?.followUps ?? [])
  const transcript = scenes.length ? buildTranscript(scenes, session?.jurisdictionNote) : ""

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-6 pb-12 sm:px-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-hand text-sm tracking-[0.22em] text-[#9fd4e2] uppercase">Chalk, not a lecture</p>
          <h1 className="font-chalk -rotate-1 text-6xl leading-none text-[#f6f1e4] sm:text-7xl">Why</h1>
        </div>
        <p className="max-w-xs font-hand text-xl leading-snug text-[#f6f1e4]/85 sm:text-right">
          A thirty-second chalkboard for a term you just heard.
        </p>
      </header>

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          ask(question)
        }}
      >
        <label className="sr-only" htmlFor="question">
          Ask a question
        </label>
        <Input
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What is a liquidity pool?"
          autoComplete="off"
          data-testid="ask-input"
          className="h-12 flex-1 border-white/30 bg-black/25 px-4 font-hand text-lg text-[#f6f1e4] placeholder:text-[#f6f1e4]/40"
        />
        <Button type="submit" data-testid="ask-submit" className="h-12 px-5 font-hand text-lg">
          Draw it
        </Button>
      </form>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {DOMAINS.map((domain) => (
          <div key={domain.id}>
            <p className="font-hand text-lg text-[#9fd4e2]">{domain.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEATURED_QUESTIONS.filter(
                (item) => seeds.find((plan) => plan.question === item)?.domain === domain.id,
              ).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant="outline"
                  onClick={() => ask(item)}
                  className="h-auto rounded-full border-white/30 bg-transparent px-3 py-1.5 font-hand text-base whitespace-normal text-[#f6f1e4] hover:bg-white/10"
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="board-frame mt-6" data-status={status} data-scene={scene?.role ?? "idle"}>
        <div className="board-surface relative aspect-video">
          {scene ? (
            <>
              <p className="pointer-events-none absolute top-3 left-4 z-10 font-hand text-sm tracking-[0.16em] text-[#f3e29a] uppercase sm:text-base">
                {scene.kicker}
              </p>
              <p className="pointer-events-none absolute top-3 right-4 z-10 font-hand text-sm text-[#9fd4e2]/90">
                {domainLabel(session?.domain ?? "")}
              </p>
            </>
          ) : null}
          <Board
            scene={scene}
            elapsedMs={elapsed}
            reducedMotion={reduced}
            message={
              status === "loading" ? "Sketching…" : status === "error" ? session?.error : undefined
            }
          />
        </div>
        <div className="ledge flex items-end justify-between gap-4 px-4 py-3 sm:px-5" aria-live="polite">
          <p data-testid="caption" className="font-hand text-lg leading-snug text-[#f6f1e4] sm:text-2xl">
            <CaptionText text={caption} spoken={spoken} />
          </p>
          <div className="mb-1 hidden shrink-0 gap-1.5 sm:flex" aria-hidden>
            {scenes.map((item, dot) => (
              <span
                key={item.id}
                className={`h-1.5 w-6 rounded-full ${dot <= index ? "bg-[#f3e29a]" : "bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!session}
          onClick={() => session && ask(session.question)}
          className="border-white/30 bg-transparent font-hand text-base text-[#f6f1e4] hover:bg-white/10"
        >
          Replay
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={status !== "playing" && status !== "paused"}
          onClick={togglePause}
          aria-pressed={status === "paused"}
          className="border-white/30 bg-transparent font-hand text-base text-[#f6f1e4] hover:bg-white/10"
        >
          {status === "paused" ? "Resume" : "Pause"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={toggleMute}
          aria-pressed={muted}
          className="border-white/30 bg-transparent font-hand text-base text-[#f6f1e4] hover:bg-white/10"
        >
          {muted ? "Voice off" : "Voice on"}
        </Button>
        {ttff != null ? (
          <p className="font-hand text-base text-[#f6f1e4]/75" data-testid="ttff" data-ttff={ttff}>
            First chalk in {formatMs(ttff)} · {session?.fromCache ? "checked shelf" : "sketched live"}
          </p>
        ) : null}
      </div>

      {session?.jurisdictionNote ? (
        <p className="mt-4 max-w-3xl font-hand text-lg leading-snug text-[#f0c59a]">{session.jurisdictionNote}</p>
      ) : null}
      {session?.error ? <p className="mt-4 font-hand text-lg text-[#f3c1cf]">{session.error}</p> : null}

      {followUps.length > 0 ? (
        <section className="mt-6" data-testid="followups">
          <h2 className="font-hand text-2xl text-[#f3e29a]">{session?.error ? "Checked questions" : "Ask next"}</h2>
          <div className="mt-2 flex flex-col items-start gap-2">
            {followUps.map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                onClick={() => ask(item)}
                className="h-auto rounded-full border-white/30 bg-transparent px-3 py-1.5 text-left font-hand text-base whitespace-normal text-[#f6f1e4] hover:bg-white/10"
              >
                {item}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {transcript ? (
        <section className="mt-6 max-w-3xl" data-testid="transcript">
          <h2 className="font-hand text-2xl text-[#f6f1e4]">Transcript</h2>
          <ol className="mt-2 space-y-2 text-base leading-relaxed text-[#f6f1e4]/90">
            {scenes.map((item, sceneIndex) => (
              <li key={item.id} className={sceneIndex === index && status !== "done" ? "text-[#f3e29a]" : undefined}>
                {item.narration}
              </li>
            ))}
          </ol>
          {session?.jurisdictionNote ? <p className="mt-3 text-[#f0c59a]">{session.jurisdictionNote}</p> : null}
        </section>
      ) : null}

      <details className="mt-8 max-w-3xl">
        <summary className="cursor-pointer font-hand text-xl text-[#f6f1e4]">
          The checked shelf · {seeds.length} explainers
        </summary>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {DOMAINS.map((domain) => (
            <div key={domain.id}>
              <h3 className="font-hand text-lg text-[#9fd4e2]">{domain.label}</h3>
              <ul className="mt-2 space-y-1">
                {seeds
                  .filter((plan) => plan.domain === domain.id)
                  .map((plan) => (
                    <li key={plan.id}>
                      <button
                        type="button"
                        onClick={() => ask(plan.question)}
                        className="text-left font-hand text-lg text-[#f6f1e4]/90 hover:text-[#f3e29a]"
                      >
                        {plan.question}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <footer className="mt-10 border-t border-white/15 pt-4" data-testid="disclaimer">
        <p className="text-sm leading-relaxed text-[#f6f1e4]/70">{DISCLAIMER}</p>
        <p className="mt-1 text-sm text-[#f6f1e4]/50">
          {voiceReady
            ? serverTts
              ? "Voice uses the configured speech service, with this browser as backup."
              : "Voice uses this browser. Captions stay on if the speaker is quiet."
            : "This browser has no speech voice. Captions still run."}
        </p>
      </footer>
    </div>
  )
}

function CaptionText({ text, spoken }: { text: string; spoken: number }) {
  if (spoken <= 0 || spoken >= text.length) return <>{text}</>
  return (
    <>
      <span className="text-[#f3e29a]">{text.slice(0, spoken)}</span>
      {text.slice(spoken)}
    </>
  )
}

function clock(): number {
  return performance.now()
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

async function* readSse(response: Response): AsyncGenerator<{ event: string; data: unknown }> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split("\n\n")
    buffer = chunks.pop() ?? ""
    for (const chunk of chunks) {
      let event = "message"
      const data: string[] = []
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim()
        else if (line.startsWith("data:")) data.push(line.slice(5).trim())
      }
      if (!data.length) continue
      yield { event, data: JSON.parse(data.join("\n")) }
    }
  }
}
