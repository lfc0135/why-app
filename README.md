# Why

Why answers a short question with a thirty-second chalkboard explainer: a hand-drawn diagram, a spoken line, and captions. It is for someone who just heard a term and wants the plain version.

Type any word. Checked fintech and company explainers are written by hand and play immediately. Every other word is looked up, with no API key, in a free dictionary and then an encyclopedia:

1. [dictionaryapi.dev](https://dictionaryapi.dev/) when it answers.
2. The Wiktionary definition API.
3. A Wikipedia summary.

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
| `LLM_MODEL` | Claude id, default `claude-haiku-5-5`. For `openai`, set this to that provider's model. |
| `LLM_API_KEY` | OpenAI-compatible key. Used only when `LLM_PROVIDER=openai`. |
| `LLM_BASE_URL` | OpenAI-compatible base URL. Defaults to `https://api.openai.com/v1`. |
| `TTS_PROVIDER` | `openai`, `elevenlabs`, or blank for the browser voice. |
| `TTS_API_KEY` | Speech key. Never commit this. |
| `TTS_BASE_URL`, `TTS_MODEL`, `TTS_VOICE` | Provider-specific. ElevenLabs needs `TTS_VOICE`. |

No keys are hardcoded.

## Limits

- Explanations are educational, not financial, legal, or tax advice. Business answers that depend on a country say so.
- Without a model key, unknown words are quoted from a dictionary or encyclopedia. They are not invented. A missing word gets spelling suggestions.
- Browser voices differ. The drawing is timed to about 30 seconds and waits if the voice runs long.
- In-browser save-to-MP4 is not the primary path. The animation is live SVG. Record the screen if you need a file.
- Figures such as a 0.3% pool fee, a 12% APR, or a four-year vest are labeled as common or example cases. They are not promises, and local rules change.
