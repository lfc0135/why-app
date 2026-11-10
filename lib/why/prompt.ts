import { DOMAINS } from "@/lib/why/content"
import { ICON_NAMES, SCENE_ROLES } from "@/lib/why/schema"

export const PRIMITIVE_TYPES = [
  "text",
  "box",
  "arrow",
  "line",
  "icon",
  "flow",
  "tree",
  "pie",
  "bars",
  "counter",
] as const

export const SYSTEM_PROMPT = `You write a 30-second chalkboard explainer for a layperson.
Return one JSON object and nothing else. No markdown.

Key order: title, domain, jurisdictionNote, scenes, followUps.

Shape:
{
  "title": "short title",
  "domain": ${JSON.stringify([...DOMAINS.map((domain) => domain.id), "general"])},
  "jurisdictionNote": "optional. Required when the answer depends on a country or legal system. Otherwise empty string.",
  "scenes": [5 scenes],
  "followUps": ["two or three short follow-up questions"]
}

Each scene:
{
  "id": "hook",
  "role": one of ${SCENE_ROLES.join(", ")},
  "kicker": "The idea | Picture it | How it works | With numbers | Remember",
  "durationMs": number,
  "narration": "spoken sentence, plain words",
  "caption": "same words as narration",
  "elements": [chalkboard primitives]
}

Roles in order: hook, analogy, mechanism, example, takeaway.
durationMs values must add up to between 28000 and 32000.
All narrations together are 70 to 90 spoken words.
Define the term in the hook. Use an everyday analogy. Show how it works. Use one concrete example and say it is an example when you invent the numbers. End with one takeaway and the main risk or limit.

Accuracy:
- Do not invent laws, tax rates, license fees, or guaranteed returns.
- Crypto yields and fees vary. Say "often" or "for example".
- Business structure depends on the country. Say so in the takeaway and put the caveat in jurisdictionNote.
- Do not tell the user how to avoid KYC, tax, or licensing.
- If you are unsure, teach only the standard idea and name the uncertainty.

Primitives, coordinates on a 1000 by 562 board. Keep drawings inside x 40-960 and y 96-520.
Every element needs delay (ms) and duration (ms). Stagger delays so strokes appear in order. delay + duration must stay under the scene durationMs.

- text: { "type":"text", "text", "x", "y", "size":"sm|md|lg|xl", "anchor":"start|middle|end", "color":"white|yellow|blue|pink|green|orange", "delay", "duration" }
- box: { "type":"box", "x", "y", "w", "h", "label"?, "color"?, "delay", "duration" }
- arrow: { "type":"arrow", "x1","y1","x2","y2", "label"?, "curved"?, "color"?, "delay", "duration" }
- line: { "type":"line", "x1","y1","x2","y2", "color"?, "delay", "duration" }
- icon: { "type":"icon", "name": one of ${ICON_NAMES.join(", ")}, "x", "y", "size", "label"?, "color"?, "delay", "duration" }
- flow: { "type":"flow", "nodes":[{"id","label","x","y"}], "edges":[{"from","to","label"?}], "delay", "duration" }
- tree: { "type":"tree", "root", "children":[strings], "x", "y", "delay", "duration" } for ownership
- pie: { "type":"pie", "cx", "cy", "r", "slices":[{"label","value"}], "delay", "duration" } for cap tables
- bars: { "type":"bars", "x", "y", "w", "h", "items":[{"label","value"}], "max"?, "delay", "duration" }
- counter: { "type":"counter", "x", "y", "from", "to", "prefix"?, "suffix"?, "label"?, "decimals"?, "size"?, "color"?, "delay", "duration" }

Use 4 to 8 elements per scene. Short labels. Do not overlap text.
Prefer icons, boxes, arrows, a tree, a pie, or a counter over paragraphs on the board.
The spoken narration carries the explanation. The board is the diagram.`
