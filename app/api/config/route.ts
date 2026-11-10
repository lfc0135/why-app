import { connection } from "next/server"
import { publicConfig } from "@/lib/why/tts"

export async function GET() {
  await connection()
  return Response.json(publicConfig())
}
