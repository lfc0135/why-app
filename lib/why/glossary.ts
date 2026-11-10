import { makeScene, type Beat } from "@/lib/why/compose"
import { topicCaution } from "@/lib/why/guard"
import { defineSeed, type IconName, type ScenePlan } from "@/lib/why/schema"

export type GlossaryEntry = {
  word: string
  partOfSpeech?: string
  definition: string
  example?: string
  related: string[]
  sourceName: string
  sourceUrl: string
}

export type LookupResult = {
  entry: GlossaryEntry | null
  suggestions: string[]
}

const USER_AGENT = "WhyApp/0.1 (educational chalkboard; local)"

const PICTURES: { test: RegExp; icon: IconName; label: string }[] = [
  { test: /\blight\b|\bsunlight\b|\bsolar\b|\bsun\b/i, icon: "sun", label: "light" },
  { test: /\bplants?\b|\bleaves\b|\bleaf\b|\btree\b/i, icon: "leaf", label: "plant" },
  { test: /\bwater\b|\bocean\b|\briver\b/i, icon: "drop", label: "water" },
  { test: /\bemotion\b|\bfeeling\b|\blove\b|\bheart\b|\blonging\b/i, icon: "heart", label: "feeling" },
  { test: /\bbook\b|\bwrit|\bstory\b|\bword\b/i, icon: "book", label: "words" },
  { test: /\btime\b|\byears?\b|\bcentury\b|\bhistory\b/i, icon: "clock", label: "time" },
  { test: /\bmountain\b|\bvolcano\b|\bearth\b|\brock\b/i, icon: "mountain", label: "earth" },
  { test: /\bfire\b|\bheat\b|\blava\b|\bflame\b/i, icon: "flame", label: "heat" },
  { test: /\bcloud\b|\bsky\b|\bweather\b/i, icon: "cloud", label: "sky" },
  { test: /\bstar\b|\bspace\b|\bplanet\b|\bgravity\b/i, icon: "star", label: "space" },
  { test: /\bbrain\b|\bmind\b|\bthink|\bmemory\b/i, icon: "brain", label: "mind" },
  { test: /\beye\b|\bsee\b|\bvision\b/i, icon: "eye", label: "see" },
  { test: /\bhouse\b|\bhome\b|\bbuild/i, icon: "house", label: "home" },
  { test: /\bflower\b|\bbloom\b/i, icon: "flower", label: "flower" },
  { test: /\benergy\b|\belectric|\bpower\b/i, icon: "bolt", label: "energy" },
  { test: /\bwave\b|\bsea\b|\bocean\b/i, icon: "wave", label: "wave" },
  { test: /\bpeople\b|\bperson\b|\bhuman\b|\bcitizen\b/i, icon: "person", label: "people" },
  { test: /\bvote\b|\bgovern|\bdemocra/i, icon: "scales", label: "rule" },
]

export function extractTerm(input: string): string {
  return input
    .trim()
    .replace(/[?!.]+$/g, "")
    .replace(/^(what|who|why|how)\s+(is|are|was|were|does|do|did)\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/^(define|explain|meaning of)\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .trim()
}

export function plainText(value: string): string {
  return value
    .replace(/<li>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 12)
}

export async function lookupTerm(raw: string, fetchImpl: typeof fetch = fetch): Promise<LookupResult> {
  const term = extractTerm(raw)
  if (term.length < 2 || term.length > 80) return { entry: null, suggestions: [] }

  const dictionary = await fromDictionaryApi(term, fetchImpl)
  if (dictionary) return { entry: await withRelated(dictionary, fetchImpl), suggestions: [] }

  const wiktionary = await fromWiktionary(term, fetchImpl)
  if (wiktionary) return { entry: await withRelated(wiktionary, fetchImpl), suggestions: [] }

  const wikipedia = await fromWikipedia(term, fetchImpl)
  if (wikipedia) return { entry: await withRelated(wikipedia, fetchImpl), suggestions: [] }

  return { entry: null, suggestions: await suggestSpellings(term, fetchImpl) }
}

export function planFromGlossary(entry: GlossaryEntry, question?: string): ScenePlan {
  const spoken = sentences(entry.definition)
  const first = clip(spoken[0] ?? entry.definition, 300)
  const second = spoken[1] && spoken[1] !== spoken[0] ? clip(spoken[1], 300) : undefined
  const pictures = picturesIn(entry.definition).slice(0, 3)
  const cause = causeEffect(entry.definition)
  const years = mentionedYears(entry.definition)
  const related = entry.related.filter((word) => word.toLowerCase() !== entry.word.toLowerCase()).slice(0, 3)
  const caution = topicCaution(`${entry.word} ${entry.definition}`)
  const ask = (question?.trim() || `What is ${entry.word}?`).slice(0, 120)

  const hookNarration = first
  const analogyNarration = analogyLine(entry, related)
  const mechanismNarration = second
    ? second
    : cause
      ? `The source says this goes from ${cause.from} to ${cause.to}.`
      : `The source lists it as ${entry.partOfSpeech ? `a ${entry.partOfSpeech.toLowerCase()}` : "one sense"}: ${clip(entry.definition, 220)}`
  const exampleNarration = entry.example
    ? clip(entry.example, 300)
    : "This source does not include an example sentence."
  const takeawayNarration = `That wording is from ${entry.sourceName}, not a paraphrase.`

  const hookBeats: Beat[] = [
    { kind: "title", text: entry.word.slice(0, 22), color: "yellow" },
    { kind: "note", text: (entry.partOfSpeech ?? "from the source").slice(0, 40) },
  ]
  if (pictures[0]) hookBeats.push({ kind: "icons", items: [pictures[0]] })

  const analogyBeats: Beat[] = pictures.length
    ? [
        { kind: "title", text: "Words in the source" },
        { kind: "icons", items: pictures },
      ]
    : [
        { kind: "title", text: "Nearby words" },
        { kind: "note", text: (related[0] ?? entry.partOfSpeech ?? entry.word).slice(0, 40) },
      ]

  const mechanismBeats: Beat[] = cause
    ? [
        { kind: "title", text: "From the wording" },
        {
          kind: "flow",
          steps: [{ label: cause.from }, { label: cause.to }],
        },
      ]
    : years.length >= 2
      ? [
          { kind: "title", text: "Years the source names" },
          { kind: "timeline", events: years },
        ]
      : [
          { kind: "title", text: "The source continues" },
          { kind: "note", text: clip(second ?? first, 72) },
        ]

  const exampleBeats: Beat[] = [
    { kind: "title", text: entry.example ? "Their example" : "No sample sentence" },
    { kind: "note", text: clip(entry.example ?? "Not in the source", 72) },
  ]

  const takeawayBeats: Beat[] = [
    { kind: "title", text: entry.word.slice(0, 22), color: "yellow" },
    { kind: "note", text: entry.sourceName.slice(0, 40) },
  ]

  const followUps = followUpQuestions(entry.word, related)

  return defineSeed({
    id: slug(entry.word),
    question: ask,
    aliases: [entry.word.toLowerCase()],
    title: entry.word.slice(0, 60),
    domain: topicId(`${entry.word} ${entry.definition}`),
    jurisdictionNote: caution,
    followUps,
    scenes: [
      makeScene({ id: "hook", role: "hook", narration: hookNarration, durationMs: 5600, beats: hookBeats }),
      makeScene({ id: "analogy", role: "analogy", narration: analogyNarration, durationMs: 5600, beats: analogyBeats }),
      makeScene({
        id: "mechanism",
        role: "mechanism",
        narration: clip(mechanismNarration, 300),
        durationMs: 7000,
        beats: mechanismBeats,
      }),
      makeScene({ id: "example", role: "example", narration: exampleNarration, durationMs: 6200, beats: exampleBeats }),
      makeScene({
        id: "takeaway",
        role: "takeaway",
        narration: takeawayNarration,
        durationMs: 5600,
        beats: takeawayBeats,
      }),
    ],
  })
}

export function sourceLine(entry: GlossaryEntry): string {
  return `${entry.sourceName} (${entry.sourceUrl})`
}

function analogyLine(entry: GlossaryEntry, related: string[]): string {
  if (related.length >= 2) {
    return `The entry points to related words, including ${related[0]} and ${related[1]}.`
  }
  if (related.length === 1) {
    return `The entry points to a related word, ${related[0]}.`
  }
  if (entry.partOfSpeech) {
    return `The source marks it as a ${entry.partOfSpeech.toLowerCase()}.`
  }
  return "The source gives this as a single sense."
}

function followUpQuestions(word: string, related: string[]): [string, string] | [string, string, string] {
  const questions = related
    .map((item) => `What is ${item}?`)
    .filter((item) => item.length >= 8 && item.length <= 90 && !item.toLowerCase().includes(word.toLowerCase()))
  const unique = [...new Set(questions)]
  while (unique.length < 2) {
    const filler = unique.length === 0 ? "What is language?" : "What is science?"
    if (!unique.includes(filler)) unique.push(filler)
    else break
  }
  return unique.slice(0, 3) as [string, string] | [string, string, string]
}

function picturesIn(definition: string): { icon: IconName; label: string; color?: "yellow" | "blue" | "green" | "pink" }[] {
  const found: { icon: IconName; label: string; color?: "yellow" | "blue" | "green" | "pink" }[] = []
  for (const picture of PICTURES) {
    const matched = definition.match(picture.test)
    if (!matched) continue
    if (found.some((item) => item.icon === picture.icon)) continue
    const labelInText = new RegExp(`\\b${picture.label}\\b`, "i").test(definition)
    const label = (labelInText ? picture.label : matched[0]).replace(/\s+/g, " ").trim().slice(0, 16)
    found.push({
      icon: picture.icon,
      label,
      color: found.length % 2 === 0 ? "yellow" : "blue",
    })
    if (found.length === 3) break
  }
  return found
}

function causeEffect(definition: string): { from: string; to: string } | null {
  const match =
    definition.match(/\bconvert\s+([^.]{3,48}?)\s+into\s+([^.]{3,48})/i) ??
    definition.match(/\bfrom\s+([^.]{3,32}?)\s+to\s+([^.]{3,32})/i)
  if (!match) return null
  const from = clipLabel(match[1])
  const to = clipLabel(match[2])
  if (from.length < 2 || to.length < 2) return null
  return { from, to }
}

function mentionedYears(definition: string): string[] {
  const years = [...definition.matchAll(/\b(1[0-9]{3}|20[0-2][0-9])\b/g)].map((match) => match[1])
  return [...new Set(years)].slice(0, 4)
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const room = Math.max(8, max - 1)
  const slice = clean.slice(0, room)
  const cut = slice.lastIndexOf(" ")
  return `${(cut > 20 ? slice.slice(0, cut) : slice).trimEnd()}…`
}

function clipLabel(text: string): string {
  const clean = plainText(text).replace(/\b(the|a|an)\b/gi, "").replace(/\s+/g, " ").trim()
  return clean.length <= 24 ? clean : `${clean.slice(0, 21).trimEnd()}…`
}

function slug(word: string): string {
  const id = word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return id || "word"
}

function topicId(text: string): string {
  if (/\b(inflat|tax|loan|stock|invest|debt|money|bank|crypto|financ)/i.test(text)) return "fintech"
  if (/\b(company|law|legal|court|contract)/i.test(text)) return "business"
  if (/\b(plant|light|energy|gravity|volcano|molecule|earth|science|cell|atom)/i.test(text)) return "science"
  if (/\b(emotion|feeling|memory|love|longing)/i.test(text)) return "feeling"
  if (/\b(century|king|war|empire|renaissance|history|ancient)/i.test(text)) return "history"
  if (/\b(computer|algorithm|software|code|machine)/i.test(text)) return "tech"
  return "general"
}

async function fromDictionaryApi(term: string, fetchImpl: typeof fetch): Promise<GlossaryEntry | null> {
  const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`, fetchImpl)
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== "object") return null
  const entry = data[0] as {
    word?: string
    meanings?: {
      partOfSpeech?: string
      synonyms?: string[]
      definitions?: { definition?: string; example?: string; synonyms?: string[] }[]
    }[]
  }
  const meaning = entry.meanings?.[0]
  const sense = meaning?.definitions?.[0]
  const definition = plainText(sense?.definition ?? "")
  if (definition.length < 40) return null
  const related = uniqueWords([
    ...(meaning?.synonyms ?? []),
    ...(sense?.synonyms ?? []),
    ...(meaning?.definitions ?? []).flatMap((item) => item.synonyms ?? []),
  ])
  return {
    word: entry.word || term,
    partOfSpeech: meaning?.partOfSpeech,
    definition,
    example: sense?.example ? plainText(sense.example) : undefined,
    related,
    sourceName: "Free Dictionary",
    sourceUrl: `https://dictionaryapi.dev/`,
  }
}

async function fromWiktionary(term: string, fetchImpl: typeof fetch): Promise<GlossaryEntry | null> {
  const data = await fetchJson(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(term)}`,
    fetchImpl,
  )
  if (!data || typeof data !== "object") return null
  const english = (data as { en?: unknown }).en
  if (!Array.isArray(english) || !english[0]) return null
  const block = english[0] as {
    partOfSpeech?: string
    definitions?: { definition?: string; examples?: string[] }[]
  }
  const sense = block.definitions?.[0]
  const html = sense?.definition ?? ""
  const definition = plainText(html)
  if (definition.length < 40) return null
  const example = sense?.examples?.[0] ? plainText(sense.examples[0]) : undefined
  const related = uniqueWords([...html.matchAll(/title="([^"]+)"/g)].map((match) => match[1]))
  return {
    word: term,
    partOfSpeech: block.partOfSpeech,
    definition,
    example,
    related,
    sourceName: "Wiktionary",
    sourceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(term.replace(/ /g, "_"))}`,
  }
}

async function fromWikipedia(term: string, fetchImpl: typeof fetch): Promise<GlossaryEntry | null> {
  const title = term
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("_")
  const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, fetchImpl)
  if (!data || typeof data !== "object") return null
  const page = data as {
    type?: string
    title?: string
    extract?: string
    description?: string
    content_urls?: { desktop?: { page?: string } }
  }
  if (page.type === "disambiguation") return null
  const definition = plainText(page.extract ?? "")
  if (!definition || definition.length < 40) return null
  return {
    word: page.title || term,
    partOfSpeech: page.description,
    definition,
    related: [],
    sourceName: "Wikipedia",
    sourceUrl: page.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  }
}

async function withRelated(entry: GlossaryEntry, fetchImpl: typeof fetch): Promise<GlossaryEntry> {
  if (entry.related.length >= 2) return entry
  const extra = await suggestRelated(entry.word, fetchImpl)
  return { ...entry, related: uniqueWords([...entry.related, ...extra]).slice(0, 6) }
}

async function suggestSpellings(term: string, fetchImpl: typeof fetch): Promise<string[]> {
  const data = await fetchJson(`https://api.datamuse.com/sug?s=${encodeURIComponent(term)}&max=6`, fetchImpl)
  if (!Array.isArray(data)) return []
  return uniqueWords(
    data
      .map((item) => (item && typeof item === "object" && "word" in item ? String(item.word) : ""))
      .filter((word) => word && word.toLowerCase() !== term.toLowerCase()),
  ).slice(0, 5)
}

async function suggestRelated(term: string, fetchImpl: typeof fetch): Promise<string[]> {
  const data = await fetchJson(
    `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(term)}&max=4`,
    fetchImpl,
  )
  if (!Array.isArray(data)) return []
  return data
    .map((item) => (item && typeof item === "object" && "word" in item ? String(item.word) : ""))
    .filter((word) => /^[a-z][a-z-]{2,24}$/i.test(word))
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    })
    if (!response.ok) return null
    const text = await response.text()
    if (!text || text.trim().startsWith("<")) return null
    return JSON.parse(text) as unknown
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function uniqueWords(words: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const word of words) {
    const clean = word.replace(/_/g, " ").replace(/\s+/g, " ").trim()
    if (!/^[A-Za-z][A-Za-z -]{1,28}$/.test(clean)) continue
    const key = clean.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(clean)
  }
  return result
}
