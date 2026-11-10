import { businessSeeds } from "@/lib/why/seeds/business"
import { fintechSeeds } from "@/lib/why/seeds/fintech"
import { liquidityPool } from "@/lib/why/seeds/liquidity-pool"
import type { ScenePlan } from "@/lib/why/schema"

export const seeds: ScenePlan[] = [liquidityPool, ...fintechSeeds, ...businessSeeds]

export function seedById(id: string): ScenePlan | undefined {
  return seeds.find((plan) => plan.id === id)
}
