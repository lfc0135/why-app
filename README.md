# Why

Why answers a short question with a thirty-second chalkboard explainer: a hand-drawn diagram, a spoken line, and captions. It is for someone who just heard a term and wants the plain version.

Type any short phrase or question. Checked fintech and company explainers are written by hand and play immediately. Every other concept, including several words such as "private credit" or "the French Revolution", is looked up with no API key:

1. A [Wikipedia summary](https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_) for the concept.
2. For a single word Wikipedia does not cover, [dictionaryapi.dev](https://dictionaryapi.dev/) and then the Wiktionary definition API.

The chalk script quotes that source. It does not invent a definition. The transcript names the source. A missing word gets spelling suggestions. With `ANTHROPIC_API_KEY` set (`LLM_PROVIDER=anthropic`), Claude writes the scene plan through the Messages API, grounded in that definition. `LLM_PROVIDER=openai` keeps an OpenAI-compatible endpoint as an alternative. The key stays on the server.

The hand-checked shelf covers two domains:

- **Fintech & crypto** — liquidity pools, APR vs APY, stablecoins, KYC, and the words around them.
- **Business structuring** — holding companies, LLCs, UAE mainland vs free zone, cap tables, vesting, and the words around them.

The board is drawn in the browser from a scene plan. It is not a generated video file, so the first strokes can start immediately.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). Try **photosynthesis**, **nostalgia**, **What is a liquidity pool?**, or any other word.

```bash
npm test
```

## How a question becomes a chalkboard

1. The question is matched against a checked shelf of scene plans. A hit plays at once, in the browser, with no network round trip.
2. Anything else is sent to `POST /api/explain`. With an Anthropic or OpenAI-compatible key, the model streams a scene plan. The player starts when the first scene arrives, before the rest of the script is finished.
3. Each scene is a few chalkboard primitives: write-on text, boxes, arrows, icons, flows, ownership trees, pies, bars, and counters.
4. The browser speaks the narration with the Web Speech API. If `TTS_PROVIDER` and `TTS_API_KEY` are set, it uses that service and falls back to the browser voice.

Checked plans live in `lib/why/seeds`. The same Zod schema validates the shelf and anything the model returns (`lib/why/schema.ts`).

## Add a domain later

1. Add an entry to `DOMAINS` in `lib/why/content.ts`.
2. Add scene plans whose `domain` is that id. The renderer does not branch on domain.
3. The model prompt lists domains from that same list.

## Environment

Copy `.env.example` to `.env.local`. Leave the keys blank to use the checked shelf and the browser voice.

| Variable | Purpose |
| --- | --- |
| `LLM_PROVIDER` | `anthropic` (default) or `openai`. |
| `ANTHROPIC_API_KEY` | Claude key for the native Messages API. Blank skips the model. Never exposed to the browser. |
| `LLM_MODEL` | Claude id, default `claude-haiku-5-5`. Haiku and Sonnet only. |
| `CLAUDE_BUDGET_USD` | Lifetime Claude ceiling. Default `$20`. Values above `$20` are clamped. |
| `CLAUDE_RUN_CAP_USD` | Per-run cap for the smoke script. Default `$2`. |
| `LLM_API_KEY` | OpenAI-compatible key. Used only when `LLM_PROVIDER=openai`. |
| `LLM_BASE_URL` | OpenAI-compatible base URL. Defaults to `https://api.openai.com/v1`. |
| `TTS_PROVIDER` | `openai`, `elevenlabs`, or blank for the browser voice. |
| `TTS_API_KEY` | Speech key. Never commit this. |
| `TTS_BASE_URL`, `TTS_MODEL`, `TTS_VOICE` | Provider-specific. ElevenLabs needs `TTS_VOICE`. |

No keys are hardcoded.

## Smoke test with your Claude key

The key stays on your machine. Export it in the shell. Do not put it in a file that gets committed. `.env.example` lists the variable and leaves it blank.

```bash
export ANTHROPIC_API_KEY="your key"
export LLM_MODEL="claude-haiku-5-5"   # or claude-sonnet-5-5
npm run smoke:claude -- "photosynthesis" "private credit"
```

That writes a script JSON and an MP4 per term under `artifacts/smoke/`. A repeated term is read from `data/script-cache` and does not call Claude. The run stops before a call that would pass `CLAUDE_RUN_CAP_USD` (default `$2`). Every Claude call is priced from Anthropic's published token rates and appended to `data/claude-ledger.json`. A call that would push the lifetime total past `CLAUDE_BUDGET_USD` (default `$20`, and never higher) is refused before it is sent.

```bash
npm run claude:status
```

`GET /api/claude/budget` returns the same spend, remaining budget, and recent calls. It does not return the key. Both `data/` and `artifacts/` are gitignored.

## Limits

- Explanations are educational, not financial, legal, or tax advice. Business answers that depend on a country say so.
- Without a model key, unknown words are quoted from a dictionary or encyclopedia. They are not invented. A missing word gets spelling suggestions.
- Browser voices differ. The drawing is timed to about 30 seconds and waits if the voice runs long.
- In-browser save-to-MP4 is not the primary path. The animation is live SVG. Record the screen if you need a file.
- Figures such as a 0.3% pool fee, a 12% APR, or a four-year vest are labeled as common or example cases. They are not promises, and local rules change.
