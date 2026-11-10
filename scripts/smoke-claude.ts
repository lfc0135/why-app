import { formatSmokeReport, runSmoke } from "@/lib/why/smoke"

async function main() {
  const terms = process.argv
    .slice(2)
    .flatMap((arg) => arg.split(","))
    .map((term) => term.trim())
    .filter(Boolean)

  if (terms.length === 0) {
    console.error('Usage: scripts/smoke_claude.sh "photosynthesis" "private credit"')
    process.exit(1)
  }

  const report = await runSmoke(terms)
  console.log(formatSmokeReport(report))
  if (report.stopped === "ANTHROPIC_API_KEY is not set" && report.terms.length === 0) {
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
