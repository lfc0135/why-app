import { budgetStatus } from "@/lib/why/ledger"

async function main() {
  const status = await budgetStatus()
  console.log("Claude budget")
  console.log(`  spent      $${status.spentUsd.toFixed(6)}`)
  console.log(`  reserved   $${status.reservedUsd.toFixed(6)}`)
  console.log(`  remaining  $${status.remainingUsd.toFixed(6)}`)
  console.log(`  budget     $${status.budgetUsd.toFixed(2)} (hard cap $${status.hardCapUsd.toFixed(2)})`)
  console.log(`  calls      ${status.calls}`)
  console.log(`  cached     ${status.cachedScripts}`)
  console.log(`  model      ${status.model}`)
  console.log(`  refusing   ${status.refusing ? "yes" : "no"}`)
  console.log(`  ledger     ${status.ledgerPath}`)
  for (const call of status.recent) {
    console.log(
      `  ${call.at}  ${call.model}  in ${call.inputTokens}  out ${call.outputTokens}  $${call.costUsd.toFixed(6)}  ${call.term}`,
    )
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
