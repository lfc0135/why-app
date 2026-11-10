export type TtsConfig = {
  provider: "openai" | "elevenlabs"
  apiKey: string
  baseUrl: string
  model: string
  voice: string
}

export function ttsConfig(): TtsConfig | null {
  const provider = (process.env.TTS_PROVIDER ?? "").trim().toLowerCase()
  const apiKey = process.env.TTS_API_KEY?.trim() ?? ""
  if (!apiKey || provider === "" || provider === "browser" || provider === "none") return null
  if (provider === "elevenlabs") {
    const voice = process.env.TTS_VOICE?.trim() ?? ""
    if (!voice) return null
    return {
      provider,
      apiKey,
      baseUrl: (process.env.TTS_BASE_URL?.trim() || "https://api.elevenlabs.io").replace(/\/$/, ""),
      model: process.env.TTS_MODEL?.trim() || "eleven_multilingual_v2",
      voice,
    }
  }
  if (provider === "openai") {
    return {
      provider,
      apiKey,
      baseUrl: (process.env.TTS_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.TTS_MODEL?.trim() || "tts-1",
      voice: process.env.TTS_VOICE?.trim() || "nova",
    }
  }
  return null
}

export function publicConfig() {
  return {
    llm: Boolean(process.env.LLM_API_KEY?.trim()),
    tts: ttsConfig() !== null,
  }
}

export async function synthesize(config: TtsConfig, text: string): Promise<ArrayBuffer> {
  if (config.provider === "openai") {
    const response = await fetch(`${config.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        voice: config.voice,
        input: text,
        response_format: "mp3",
      }),
    })
    if (!response.ok) throw new Error(`Speech request failed (${response.status})`)
    return response.arrayBuffer()
  }

  const response = await fetch(`${config.baseUrl}/v1/text-to-speech/${config.voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": config.apiKey,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: config.model,
    }),
  })
  if (!response.ok) throw new Error(`Speech request failed (${response.status})`)
  return response.arrayBuffer()
}
