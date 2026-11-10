import { connection } from "next/server"
import { budgetStatus } from "@/lib/why/ledger"

export async function GET() {
  await connection()
  const status = await budgetStatus()
  return Response.json({
    budgetUsd: status.budgetUsd,
    hardCapUsd: status.hardCapUsd,
    spentUsd: status.spentUsd,
    reservedUsd: status.reservedUsd,
    remainingUsd: status.remainingUsd,
    calls: status.calls,
    cachedScripts: status.cachedScripts,
    refusing: status.refusing,
    model: status.model,
    recent: status.recent,
  })
}
