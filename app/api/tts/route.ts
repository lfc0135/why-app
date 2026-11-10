import { connection } from "next/server"
import { synthesize, ttsConfig } from "@/lib/why/tts"

export async function POST(request: Request) {
  await connection()
  const config = ttsConfig()
  if (!config) {
    return Response.json({ error: "Browser speech is the voice for this run." }, { status: 404 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }
  const text = typeof body === "object" && body && "text" in body ? (body as { text: unknown }).text : ""
  if (typeof text !== "string" || text.trim().length < 2 || text.length > 500) {
    return Response.json({ error: "Text must be a short narration." }, { status: 400 })
  }
  try {
    const audio = await synthesize(config, text.trim())
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return Response.json({ error: "Speech service failed." }, { status: 502 })
  }
}
