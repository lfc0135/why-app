import { ASK } from "@/lib/why/content"
import { makeScene } from "@/lib/why/compose"
import { defineSeed, type ScenePlan } from "@/lib/why/schema"

const D = [5200, 5600, 7000, 6400, 5800] as const

function plan(
  input: Omit<ScenePlan, "scenes"> & {
    scenes: Parameters<typeof makeScene>[0][]
  },
): ScenePlan {
  return defineSeed({
    ...input,
    scenes: input.scenes.map((scene, index) =>
      makeScene({ ...scene, durationMs: scene.durationMs ?? D[index] }),
    ),
  })
}

export const businessSeeds: ScenePlan[] = [
  plan({
    id: "holding-company",
    question: ASK.holding,
    aliases: ["holding company", "holding companies", "parent company"],
    title: "Holding company",
    domain: "business",
    jurisdictionNote:
      "Ownership, liability, and tax depend on the country. In the UAE, mainland and free zone companies are licensed differently.",
    followUps: [ASK.subsidiary, ASK.dividend, ASK.uae],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A holding company owns other companies, instead of selling the product itself.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "It owns. It doesn't sell." },
          { kind: "icons", items: [{ icon: "building", label: "owns shares", color: "yellow" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a parent of several shops who never stands behind the counter.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Never behind the counter" },
          {
            kind: "icons",
            items: [
              { icon: "person", label: "parent", color: "yellow" },
              { icon: "building", label: "shops", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "It holds the shares. The subsidiaries do the daily work. Profits can come up as dividends.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Shares up, work down" },
          {
            kind: "flow",
            steps: [{ label: "Owns shares" }, { label: "They work" }, { label: "Dividends" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "Say it owns all of a design studio, and sixty percent of a cafe.",
        durationMs: D[3],
        beats: [
          {
            kind: "tree",
            root: "Holding co.",
            children: ["Studio 100%", "Cafe 60%"],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "It owns. They operate. The country you choose changes the legal and tax rules.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Holding co.",
            leftBody: "Owns the shares",
            rightTitle: "Subsidiaries",
            rightBody: "Do the work",
          },
        ],
      },
    ],
  }),
  plan({
    id: "llc-vs-sole-proprietorship",
    question: ASK.llc,
    aliases: ["llc vs sole proprietorship", "sole proprietorship", "limited liability company"],
    title: "LLC vs sole prop",
    domain: "business",
    jurisdictionNote:
      "This is the United States picture. Other countries use different names. A UAE company is not the same filing as a US LLC.",
    followUps: [ASK.holding, ASK.uae, ASK.equity],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A sole proprietorship is you in business under your own name. An LLC is its own legal person.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "You, or a separate person" },
          { kind: "pair", left: "Sole prop", right: "LLC", mark: "vs" },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Picture a stall with your name, versus a stall with its own name on the permit.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Whose name is on it?" },
          {
            kind: "icons",
            items: [
              { icon: "person", label: "your name", color: "yellow" },
              { icon: "document", label: "its permit", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration:
          "A sole prop is simpler, and debts can reach your savings. An LLC needs more forms, and a shield if the money stays separate.",
        durationMs: D[2],
        beats: [
          {
            kind: "compare",
            leftTitle: "Sole prop",
            leftBody: "Debts can reach you",
            rightTitle: "LLC",
            rightBody: "Shield if separated",
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "In the United States, a one-owner LLC is often taxed like a sole prop unless you elect otherwise.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "US tax is often a choice" },
          {
            kind: "flow",
            steps: [{ label: "One owner" }, { label: "Default" }, { label: "Or elect" }],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "Names and tax forms change by country. This is the US picture, not a universal filing.",
        durationMs: D[4],
        beats: [
          { kind: "title", text: "Not the same in every country" },
          { kind: "icons", items: [{ icon: "globe", label: "local forms", color: "yellow" }] },
        ],
      },
    ],
  }),
  plan({
    id: "uae-mainland-vs-free-zone",
    question: ASK.uae,
    aliases: ["mainland vs free zone", "free zone vs mainland", "uae free zone", "uae mainland"],
    title: "Mainland vs free zone",
    domain: "business",
    jurisdictionNote:
      "Many mainland activities allow full foreign ownership. UAE corporate tax and any free-zone zero rate depend on activity, substance, and current rules.",
    followUps: [ASK.holding, ASK.llc, ASK.subsidiary],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "In the UAE, mainland and free zone are two ways to license a company.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Two UAE licenses" },
          { kind: "pair", left: "Mainland", right: "Free zone", mark: "vs" },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Mainland opens onto the local market. A free zone is a park with its own licensing authority.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "City street, or a park" },
          {
            kind: "icons",
            items: [
              { icon: "building", label: "mainland", color: "yellow" },
              { icon: "globe", label: "free zone", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "The emirate licenses mainland firms. Each free zone licenses its own list of activities.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Who issues the license" },
          {
            kind: "flow",
            steps: [{ label: "Emirate" }, { label: "Mainland" }, { label: "Local sales" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "A cafe for local walk-ins usually needs mainland. Software sold abroad often fits a free zone.",
        durationMs: D[3],
        beats: [
          {
            kind: "compare",
            leftTitle: "Local cafe",
            leftBody: "Usually mainland",
            rightTitle: "Software abroad",
            rightBody: "Often a free zone",
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "Both can owe UAE corporate tax. Zero percent in a free zone applies only if strict tests are met.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Both",
            leftBody: "Can owe tax",
            rightTitle: "Zero percent",
            rightBody: "Only if tests pass",
          },
        ],
      },
    ],
  }),
  plan({
    id: "cap-table",
    question: ASK.cap,
    aliases: ["cap table", "capitalization table", "cap tables"],
    title: "Cap table",
    domain: "business",
    jurisdictionNote:
      "Which shares can vote, and how options are granted, depends on the country and the company's documents.",
    followUps: [ASK.dilution, ASK.options, ASK.equity],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A cap table is the list of who owns the company, once every promise of shares is counted.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Who owns what" },
          { kind: "icons", items: [{ icon: "document", label: "the list", color: "yellow" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a pie of the shop, including slices promised to people you have not hired yet.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "A pie, including promises" },
          { kind: "icons", items: [{ icon: "chart", label: "slices", color: "pink" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "It lists shares, options, and notes that can become shares. Fully diluted means those count too.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Count what can become shares" },
          {
            kind: "flow",
            steps: [{ label: "Shares" }, { label: "Options" }, { label: "Notes" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "One version: founders seventy percent, an option pool ten, and an investor twenty.",
        durationMs: D[3],
        beats: [
          {
            kind: "pie",
            slices: [
              { label: "Founders", value: 70 },
              { label: "Option pool", value: 10 },
              { label: "Investor", value: 20 },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "The pie changes when you raise money. Local company law decides which slices can vote.",
        durationMs: D[4],
        beats: [
          { kind: "title", text: "Raising money recuts it" },
          { kind: "icons", items: [{ icon: "scales", label: "local rules", color: "yellow" }] },
        ],
      },
    ],
  }),
  plan({
    id: "equity-vs-debt",
    question: ASK.equity,
    aliases: ["equity vs debt", "debt vs equity", "equity financing", "debt financing"],
    title: "Equity vs debt",
    domain: "business",
    jurisdictionNote:
      "Loans, share issues, and what happens if you cannot pay are governed by the contract and by local law.",
    followUps: [ASK.cap, ASK.vest, ASK.dividend],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "Equity sells a slice of the company. Debt is a loan you promise to repay.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "A slice, or a loan" },
          { kind: "pair", left: "Equity", right: "Debt", mark: "vs" },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Equity is a partner who shares the upside. Debt is a lender who wants to be paid.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Partner or lender" },
          {
            kind: "icons",
            items: [
              { icon: "person", label: "partner", color: "yellow" },
              { icon: "bank", label: "lender", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "Equity has no set repayment. Debt does, even in a thin year, unless the contract says otherwise.",
        durationMs: D[2],
        beats: [
          {
            kind: "compare",
            leftTitle: "Equity",
            leftBody: "No set repayments",
            rightTitle: "Debt",
            rightBody: "Payments are due",
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration:
          "Example only: one hundred thousand dollars for ten percent, or the same sum borrowed at eight percent interest.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "One example, not advice" },
          {
            kind: "counters",
            items: [
              { to: 10, suffix: "%", label: "sold", color: "yellow" },
              { to: 8, suffix: "%", label: "interest", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "Which is wiser depends on the business and the country. This is not a recommendation.",
        durationMs: D[4],
        beats: [
          { kind: "title", text: "Not a recommendation" },
          { kind: "icons", items: [{ icon: "scales", label: "it depends", color: "orange" }] },
        ],
      },
    ],
  }),
  plan({
    id: "vesting",
    question: ASK.vest,
    aliases: ["vesting", "cliff", "vest"],
    title: "Vesting",
    domain: "business",
    jurisdictionNote:
      "A vesting schedule is a contract. Employment and securities rules change what happens if someone leaves.",
    followUps: [ASK.options, ASK.cap, ASK.dilution],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "Vesting means you earn shares or options over time, instead of owning the whole grant on day one.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Earned over time" },
          { kind: "icons", items: [{ icon: "key", label: "over time", color: "yellow" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a shop key that turns a little more each month, not all the way on day one.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "The key turns monthly" },
          { kind: "icons", items: [{ icon: "lock", label: "not day one", color: "blue" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration:
          "Startups often use four years with a one-year cliff. Leave before the cliff, and unvested shares usually stay with the company.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Four years, one-year cliff" },
          {
            kind: "flow",
            steps: [{ label: "Day 1" }, { label: "Cliff" }, { label: "Year 4" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "A grant of forty-eight hundred shares vests twelve hundred at the cliff, then about a hundred a month.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "4,800 shares, for example" },
          {
            kind: "counters",
            items: [
              { to: 1200, label: "at cliff", color: "yellow" },
              { to: 100, label: "each month", color: "green" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "It protects co-founders if someone leaves early. Your contract and local law set the details.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Why",
            leftBody: "If someone leaves",
            rightTitle: "The details",
            rightBody: "Contract and law",
          },
        ],
      },
    ],
  }),
  plan({
    id: "dilution",
    question: ASK.dilution,
    aliases: ["dilution", "diluted", "share dilution"],
    title: "Dilution",
    domain: "business",
    jurisdictionNote: "Who can issue new shares is set by the company's documents and by local company law.",
    followUps: [ASK.cap, ASK.options, ASK.equity],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "Dilution means your percent of the company shrinks when new shares are issued.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Your percent gets thinner" },
          { kind: "icons", items: [{ icon: "chart", label: "thinner", color: "orange" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like cutting more slices from the same pie. Your count of slices can stay put while each gets thinner.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "More slices, thinner piece" },
          { kind: "icons", items: [{ icon: "chart", label: "pie", color: "pink" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "The company issues new shares to an investor. Owners who do not buy in hold a smaller percent.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "New shares, smaller percent" },
          {
            kind: "flow",
            steps: [{ label: "New shares" }, { label: "Investor" }, { label: "You %" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "Own ten of one hundred shares. Issue one hundred more, and those ten are five percent.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "10 of 100 becomes 5%" },
          {
            kind: "counters",
            items: [
              { to: 10, suffix: "%", label: "before", color: "yellow" },
              { to: 5, suffix: "%", label: "after", color: "orange" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "A smaller percent can still be worth more if the new money grows the company.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Percent",
            leftBody: "Can shrink",
            rightTitle: "Value",
            rightBody: "Can still rise",
          },
        ],
      },
    ],
  }),
  plan({
    id: "dividend",
    question: ASK.dividend,
    aliases: ["dividend", "dividends"],
    title: "Dividend",
    domain: "business",
    jurisdictionNote: "Whether a company may pay a dividend, and the tax on it, depends on local law.",
    followUps: [ASK.holding, ASK.equity, ASK.subsidiary],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A dividend is a payment of profit to shareholders, if the company decides to send one.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Profit paid to owners" },
          { kind: "icons", items: [{ icon: "coin", label: "payout", color: "yellow" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like the shop splitting some leftover cash among its owners.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Leftover cash, split" },
          {
            kind: "icons",
            items: [
              { icon: "building", label: "shop", color: "white" },
              { icon: "person", label: "owners", color: "yellow" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "The board declares it. The company pays cash or more shares. It does not have to happen every year.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "The board has to declare it" },
          {
            kind: "flow",
            steps: [{ label: "Profit" }, { label: "Board" }, { label: "Pay" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "A subsidiary can pay a dividend up to a holding company, which may pass it on.",
        durationMs: D[3],
        beats: [
          {
            kind: "tree",
            root: "Holding co.",
            children: ["Subsidiary", "Dividend up"],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "Whether it can be paid, and the tax on it, depends on the country and the company's rules.",
        durationMs: D[4],
        beats: [
          { kind: "title", text: "Tax and rules are local" },
          { kind: "icons", items: [{ icon: "globe", label: "local tax", color: "blue" }] },
        ],
      },
    ],
  }),
  plan({
    id: "subsidiary",
    question: ASK.subsidiary,
    aliases: ["subsidiary", "subsidiaries"],
    title: "Subsidiary",
    domain: "business",
    jurisdictionNote:
      "Control tests and whether debts stay inside the subsidiary depend on the facts and on local law.",
    followUps: [ASK.holding, ASK.dividend, ASK.uae],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A subsidiary is a company controlled by another company, called the parent.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Controlled by a parent" },
          { kind: "icons", items: [{ icon: "building", label: "parent", color: "yellow" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a shop with its own till, while a parent company holds the keys.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Own till, parent's keys" },
          {
            kind: "icons",
            items: [
              { icon: "key", label: "parent", color: "yellow" },
              { icon: "building", label: "shop", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "Control usually means more than half the votes. The subsidiary is still its own legal person.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Usually more than half" },
          {
            kind: "counters",
            items: [
              { to: 51, suffix: "%", label: "votes", color: "yellow" },
              { to: 1, label: "legal person", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "A holding company might own all of a studio and sixty percent of a cafe. Both can be subsidiaries.",
        durationMs: D[3],
        beats: [
          { kind: "tree", root: "Parent", children: ["Studio 100%", "Cafe 60%"] },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "Keeping debts in one subsidiary is the idea. It is not an absolute shield, and the country sets the rules.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "The idea",
            leftBody: "Debts stay inside",
            rightTitle: "The limit",
            rightBody: "Not an absolute shield",
          },
        ],
      },
    ],
  }),
  plan({
    id: "option-pool",
    question: ASK.options,
    aliases: ["option pool", "employee option pool", "option pool shares"],
    title: "Option pool",
    domain: "business",
    jurisdictionNote:
      "Option grants are securities. What employees can receive, and the tax, depends on the country.",
    followUps: [ASK.vest, ASK.cap, ASK.dilution],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "An option pool is a slice of shares set aside so employees can earn ownership later.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Shares set aside for hires" },
          { kind: "icons", items: [{ icon: "person", label: "future hires", color: "yellow" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like reserving slices of pie before the guests arrive, so new hires have a piece.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Slices saved for later" },
          { kind: "icons", items: [{ icon: "chart", label: "reserved", color: "pink" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "The company grants options from that pool. Vesting decides when a hire actually earns them.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Grant, then vest" },
          {
            kind: "flow",
            steps: [{ label: "Pool" }, { label: "Grant" }, { label: "Vest" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "A ten percent pool means a tenth of the company is reserved for the team.",
        durationMs: D[3],
        beats: [
          {
            kind: "pie",
            slices: [
              { label: "Founders", value: 70 },
              { label: "Pool", value: 10 },
              { label: "Investor", value: 20 },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "It is often carved out before an investment, from the founders' side. Securities rules are local.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Often",
            leftBody: "Before a round",
            rightTitle: "From",
            rightBody: "The founders' side",
          },
        ],
      },
    ],
  }),
]
