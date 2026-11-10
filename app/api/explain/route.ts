import { explain, toSse } from "@/lib/why/explain"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Expected a JSON question." }, { status: 400 })
  }
  const question =
    typeof body === "object" && body && "question" in body
      ? (body as { question: unknown }).question
      : ""
  if (typeof question !== "string") {
    return Response.json({ error: "Ask a question as text." }, { status: 400 })
  }
  return toSse(explain(question))
}
