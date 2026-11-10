# Why

Why answers a short question with a thirty-second chalkboard explainer: a hand-drawn diagram, a spoken line, and captions. It is for someone who just heard a term and wants the plain version.

The first shelf covers two domains:

- **Fintech & crypto** — liquidity pools, APR vs APY, stablecoins, KYC, and the words around them.
- **Business structuring** — holding companies, LLCs, UAE mainland vs free zone, cap tables, vesting, and the words around them.

The board is drawn in the browser from a scene plan. It is not a generated video file, so the first strokes can start immediately.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). Try **What is a liquidity pool?** or **What is a holding company?**

```bash
npm test
```

## How a question becomes a chalkboard

1. The question is matched against a checked shelf of scene plans. A hit plays at once, in the browser, with no network round trip.
2. Anything else is sent to `POST /api/explain`. If `LLM_API_KEY` is set, an OpenAI-compatible model streams a scene plan. The player starts when the first scene arrives, before the rest of the script is finished.
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
| `LLM_API_KEY` | OpenAI-compatible key. Blank keeps Why on the checked shelf. |
| `LLM_BASE_URL` | Defaults to `https://api.openai.com/v1`. |
| `LLM_MODEL` | Defaults to `gpt-4o-mini`. |
| `TTS_PROVIDER` | `openai`, `elevenlabs`, or blank for the browser voice. |
| `TTS_API_KEY` | Speech key. Never commit this. |
| `TTS_BASE_URL`, `TTS_MODEL`, `TTS_VOICE` | Provider-specific. ElevenLabs needs `TTS_VOICE`. |

No keys are hardcoded.

## Limits

- Explanations are educational, not financial, legal, or tax advice. Business answers that depend on a country say so.
- Without an LLM key, only the checked shelf plays. Unknown questions are refused instead of invented.
- Browser voices differ. The drawing is timed to about 30 seconds and waits if the voice runs long.
- In-browser save-to-MP4 is not the primary path. The animation is live SVG. Record the screen if you need a file.
- Figures such as a 0.3% pool fee, a 12% APR, or a four-year vest are labeled as common or example cases. They are not promises, and local rules change.
