import { z } from "zod"

export const ICON_NAMES = [
  "coin",
  "wallet",
  "bank",
  "chart",
  "building",
  "person",
  "lock",
  "document",
  "percent",
  "globe",
  "shield",
  "cup",
  "key",
  "scales",
  "sun",
  "leaf",
  "drop",
  "heart",
  "book",
  "clock",
  "mountain",
  "flame",
  "cloud",
  "star",
  "brain",
  "eye",
  "house",
  "flower",
  "bolt",
  "wave",
] as const

export const CHALK_COLORS = [
  "white",
  "yellow",
  "blue",
  "pink",
  "green",
  "orange",
] as const

export const SCENE_ROLES = [
  "hook",
  "analogy",
  "mechanism",
  "example",
  "takeaway",
] as const

const colorSchema = z.enum(CHALK_COLORS)
const delaySchema = z.number().min(0).max(20000)
const drawSchema = z.number().min(120).max(12000)
const sizeSchema = z.enum(["sm", "md", "lg", "xl"])

const textSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1).max(72),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(562),
  size: sizeSchema,
  color: colorSchema.optional(),
  anchor: z.enum(["start", "middle", "end"]).optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const boxSchema = z.object({
  type: z.literal("box"),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(562),
  w: z.number().min(24).max(920),
  h: z.number().min(24).max(520),
  label: z.string().min(1).max(32).optional(),
  color: colorSchema.optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const arrowSchema = z.object({
  type: z.literal("arrow"),
  x1: z.number().min(0).max(1000),
  y1: z.number().min(0).max(562),
  x2: z.number().min(0).max(1000),
  y2: z.number().min(0).max(562),
  label: z.string().min(1).max(28).optional(),
  curved: z.boolean().optional(),
  color: colorSchema.optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const lineSchema = z.object({
  type: z.literal("line"),
  x1: z.number().min(0).max(1000),
  y1: z.number().min(0).max(562),
  x2: z.number().min(0).max(1000),
  y2: z.number().min(0).max(562),
  color: colorSchema.optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const iconSchema = z.object({
  type: z.literal("icon"),
  name: z.enum(ICON_NAMES),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(562),
  size: z.number().min(28).max(200),
  label: z.string().min(1).max(24).optional(),
  color: colorSchema.optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const flowSchema = z
  .object({
    type: z.literal("flow"),
    nodes: z
      .array(
        z.object({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(24),
          x: z.number().min(0).max(1000),
          y: z.number().min(0).max(562),
        }),
      )
      .min(2)
      .max(5),
    edges: z
      .array(
        z.object({
          from: z.string().min(1),
          to: z.string().min(1),
          label: z.string().min(1).max(24).optional(),
        }),
      )
      .min(1)
      .max(6),
    color: colorSchema.optional(),
    delay: delaySchema,
    duration: drawSchema,
  })
  .superRefine((flow, ctx) => {
    const ids = new Set(flow.nodes.map((node) => node.id))
    flow.edges.forEach((edge, index) => {
      if (!ids.has(edge.from) || !ids.has(edge.to)) {
        ctx.addIssue({
          code: "custom",
          message: "Arrow must connect two boxes in the flow.",
          path: ["edges", index],
        })
      }
    })
  })

const treeSchema = z.object({
  type: z.literal("tree"),
  root: z.string().min(1).max(28),
  children: z.array(z.string().min(1).max(28)).min(2).max(4),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(562),
  color: colorSchema.optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const pieSchema = z.object({
  type: z.literal("pie"),
  cx: z.number().min(0).max(1000),
  cy: z.number().min(0).max(562),
  r: z.number().min(48).max(170),
  slices: z
    .array(
      z.object({
        label: z.string().min(1).max(18),
        value: z.number().positive().max(10000),
      }),
    )
    .min(2)
    .max(6),
  delay: delaySchema,
  duration: drawSchema,
})

const barsSchema = z.object({
  type: z.literal("bars"),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(562),
  w: z.number().min(120).max(900),
  h: z.number().min(80).max(420),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(16),
        value: z.number().nonnegative().max(100000),
      }),
    )
    .min(2)
    .max(5),
  max: z.number().positive().optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const timelineSchema = z.object({
  type: z.literal("timeline"),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(562),
  w: z.number().min(160).max(920),
  events: z
    .array(z.object({ label: z.string().min(1).max(18) }))
    .min(2)
    .max(4),
  color: colorSchema.optional(),
  delay: delaySchema,
  duration: drawSchema,
})

const counterSchema = z.object({
  type: z.literal("counter"),
  x: z.number().min(0).max(1000),
  y: z.number().min(0).max(562),
  from: z.number(),
  to: z.number(),
  prefix: z.string().max(4).optional(),
  suffix: z.string().max(12).optional(),
  label: z.string().min(1).max(24).optional(),
  decimals: z.number().int().min(0).max(2).optional(),
  size: z.enum(["md", "lg", "xl"]).optional(),
  color: colorSchema.optional(),
  delay: delaySchema,
  duration: drawSchema,
})

export const primitiveSchema = z.discriminatedUnion("type", [
  textSchema,
  boxSchema,
  arrowSchema,
  lineSchema,
  iconSchema,
  flowSchema,
  treeSchema,
  pieSchema,
  barsSchema,
  counterSchema,
  timelineSchema,
])

export const sceneSchema = z.object({
  id: z.string().min(1).max(40),
  role: z.enum(SCENE_ROLES),
  kicker: z.string().min(1).max(32),
  durationMs: z.number().int().min(3500).max(12000),
  narration: z.string().min(8).max(320),
  caption: z.string().min(8).max(320),
  elements: z.array(primitiveSchema).min(1).max(16),
})

export const scenePlanSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    question: z.string().min(3).max(120),
    aliases: z.array(z.string().min(1).max(80)).min(1).max(12),
    title: z.string().min(1).max(60),
    domain: z.string().min(1).max(32),
    jurisdictionNote: z.string().min(8).max(280).optional(),
    scenes: z.array(sceneSchema).min(4).max(6),
    followUps: z.array(z.string().min(8).max(90)).min(2).max(3),
  })
  .superRefine((plan, ctx) => {
    const total = plan.scenes.reduce((sum, scene) => sum + scene.durationMs, 0)
    if (total < 26000 || total > 36000) {
      ctx.addIssue({
        code: "custom",
        message: `Scenes add up to ${total}ms. Keep a checked explainer near 30 seconds.`,
        path: ["scenes"],
      })
    }
    if (plan.scenes[0]?.role !== "hook") {
      ctx.addIssue({
        code: "custom",
        message: "The first scene is the hook.",
        path: ["scenes", 0, "role"],
      })
    }
    if (plan.scenes.at(-1)?.role !== "takeaway") {
      ctx.addIssue({
        code: "custom",
        message: "The last scene is the takeaway.",
        path: ["scenes", plan.scenes.length - 1, "role"],
      })
    }
    for (const role of SCENE_ROLES) {
      if (!plan.scenes.some((scene) => scene.role === role)) {
        ctx.addIssue({
          code: "custom",
          message: `Missing the ${role} scene.`,
          path: ["scenes"],
        })
      }
    }
  })

export type ChalkColor = z.infer<typeof colorSchema>
export type IconName = (typeof ICON_NAMES)[number]
export type SceneRole = z.infer<typeof sceneSchema>["role"]
export type Primitive = z.infer<typeof primitiveSchema>
export type Scene = z.infer<typeof sceneSchema>
export type ScenePlan = z.infer<typeof scenePlanSchema>

export function defineSeed(input: ScenePlan): ScenePlan {
  const parsed = scenePlanSchema.safeParse(input)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "plan"}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid seed ${input.id}: ${detail}`)
  }
  return parsed.data
}
