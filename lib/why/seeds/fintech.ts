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

export const fintechSeeds: ScenePlan[] = [
  plan({
    id: "apr-vs-apy",
    question: ASK.apr,
    aliases: ["apr vs apy", "apy vs apr", "apr apy", "annual percentage yield"],
    title: "APR vs APY",
    domain: "fintech",
    jurisdictionNote:
      "A posted crypto yield can change and is not a bank rate. What you are owed is whatever the product's terms actually say.",
    followUps: [ASK.yield, ASK.stable, ASK.pool],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "APR is the plain yearly rate, with no compounding baked in. APY is the rate after compounding.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "APR plain. APY compounds." },
          { kind: "pair", left: "APR", right: "APY", mark: "vs" },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Think of APR as the sticker. APY is the sticker after interest starts earning interest.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Interest on interest" },
          {
            kind: "icons",
            items: [
              { icon: "percent", label: "sticker", color: "yellow" },
              { icon: "coin", label: "grows", color: "green" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "Compounded monthly, each month's rate is paid on a slightly bigger pile.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Paid on a bigger pile" },
          {
            kind: "flow",
            steps: [{ label: "Month 1" }, { label: "Month 2" }, { label: "Bigger" }],
            edge: "compounds",
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "Twelve percent APR, compounded every month, comes out near 12.7 percent APY.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "12% APR, paid monthly" },
          {
            kind: "bars",
            max: 16,
            items: [
              { label: "APR", value: 12 },
              { label: "APY", value: 12.7 },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "In crypto that posted number can change tomorrow. Treat it as a snapshot, not a promise.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Snapshot",
            leftBody: "Yields can move",
            rightTitle: "A promise",
            rightBody: "Only if signed",
          },
        ],
      },
    ],
  }),
  plan({
    id: "stablecoin",
    question: ASK.stable,
    aliases: ["stablecoin", "stable coin", "usdc", "dollar token"],
    title: "Stablecoin",
    domain: "fintech",
    jurisdictionNote:
      "Reserve rules, and whether anyone makes you whole if the price slips, depend on the issuer and the country.",
    followUps: [ASK.pool, ASK.wallet, ASK.kyc],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A stablecoin is a token built to hold a steady price, usually one US dollar.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Built to stay near $1" },
          {
            kind: "icons",
            items: [
              { icon: "coin", label: "token", color: "yellow" },
              { icon: "bank", label: "reserves", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a casino chip that is meant to stay worth one dollar at the window.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "A chip worth a dollar" },
          { kind: "icons", items: [{ icon: "coin", label: "$1", color: "green" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration:
          "Some hold cash and bonds. Some lock extra crypto. Some used only a rule, and those have broken.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Backing is not all alike" },
          {
            kind: "flow",
            steps: [{ label: "Cash" }, { label: "Crypto" }, { label: "A rule" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "You might pay a dollar for one token, and later see it trade at ninety-nine cents.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "The aim, and a slip" },
          {
            kind: "counters",
            items: [
              { to: 1, prefix: "$", label: "aim", decimals: 0, color: "yellow" },
              { to: 0.99, prefix: "$", label: "can slip", decimals: 2, color: "orange" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "It is not a bank deposit. Your protection depends on the issuer and the country.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Not a deposit",
            leftBody: "No bank guarantee",
            rightTitle: "Check issuer",
            rightBody: "Reserves differ",
          },
        ],
      },
    ],
  }),
  plan({
    id: "kyc",
    question: ASK.kyc,
    aliases: ["kyc", "know your customer", "identity check"],
    title: "KYC",
    domain: "fintech",
    jurisdictionNote:
      "Which documents are required depends on the country and the firm. KYC is a legal check, not a tip for avoiding one.",
    followUps: [ASK.dex, ASK.wallet, ASK.stable],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "KYC means Know Your Customer. A service checks who you are before it holds your money.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Know Your Customer" },
          {
            kind: "icons",
            items: [
              { icon: "person", label: "you", color: "yellow" },
              { icon: "document", label: "ID", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a bank clerk asking for your ID before opening the account.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "ID before the account" },
          {
            kind: "icons",
            items: [
              { icon: "bank", label: "bank", color: "white" },
              { icon: "lock", label: "check", color: "yellow" },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "You show a government ID and a selfie. Sometimes a bill that shows where you live.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "What they usually ask" },
          { kind: "flow", steps: [{ label: "ID" }, { label: "Selfie" }, { label: "Address" }] },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "A licensed exchange does this to fight fraud and money laundering. It is not a credit score.",
        durationMs: D[3],
        beats: [
          {
            kind: "compare",
            leftTitle: "The point",
            leftBody: "Fraud and laundering",
            rightTitle: "Not this",
            rightBody: "Not a credit score",
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "The papers they ask for depend on the country. It is not a way around the law.",
        durationMs: D[4],
        beats: [
          { kind: "title", text: "Rules follow the country" },
          { kind: "icons", items: [{ icon: "globe", label: "local law", color: "blue" }] },
        ],
      },
    ],
  }),
  plan({
    id: "impermanent-loss",
    question: ASK.il,
    aliases: ["impermanent loss", "divergence loss"],
    title: "Impermanent loss",
    domain: "fintech",
    followUps: [ASK.pool, ASK.amm, ASK.yield],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "Impermanent loss is the gap when a pool's mix leaves you behind just holding the tokens.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Behind simply holding" },
          {
            kind: "icons",
            items: [
              { icon: "coin", label: "hold", color: "green" },
              { icon: "chart", label: "pool", color: "orange" },
            ],
          },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a fruit stand that sells the popular fruit and hands you more of the other one.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "The stand rebalances" },
          { kind: "icons", items: [{ icon: "cup", label: "stand", color: "yellow" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "The pool sells some of the token that rose and buys the one that lagged, to keep its pricing rule.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Sells the winner" },
          {
            kind: "flow",
            steps: [{ label: "Price up" }, { label: "Pool sells" }, { label: "New mix" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "If one token doubles against the other, you can be about six percent behind simply holding both.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "One token doubles" },
          {
            kind: "counters",
            items: [
              { to: 2, suffix: "x", label: "price", color: "yellow" },
              { to: 6, suffix: "%", label: "behind", color: "orange" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "The gap can shrink if the price comes back. Trading fees might cover it. They also might not.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "If price returns",
            leftBody: "The gap can shrink",
            rightTitle: "Fees",
            rightBody: "May not cover it",
          },
        ],
      },
    ],
  }),
  plan({
    id: "automated-market-maker",
    question: ASK.amm,
    aliases: ["automated market maker", "amm", "constant product"],
    title: "Automated market maker",
    domain: "fintech",
    followUps: [ASK.pool, ASK.dex, ASK.il],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "An automated market maker is the pricing rule inside a liquidity pool.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "The rule in the pool" },
          { kind: "formula", text: "x · y = k" },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a vending machine that raises the price as one shelf gets thin.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "A machine, not a clerk" },
          { kind: "icons", items: [{ icon: "cup", label: "machine", color: "yellow" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "A classic rule keeps the two balances' product constant. Traders move the price by swapping.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Swap, and the price moves" },
          {
            kind: "flow",
            steps: [{ label: "You swap" }, { label: "Mix shifts" }, { label: "New price" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "Buy the scarce token and the machine charges more. The pool, not a person, is the quote.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "Scarce token costs more" },
          {
            kind: "icons",
            items: [
              { icon: "coin", label: "scarce", color: "orange" },
              { icon: "percent", label: "higher", color: "yellow" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "People who stock the pool are the supply. The rule only sets the price.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "People",
            leftBody: "Stock the pool",
            rightTitle: "The rule",
            rightBody: "Sets the price",
          },
        ],
      },
    ],
  }),
  plan({
    id: "crypto-wallet",
    question: ASK.wallet,
    aliases: ["crypto wallet", "wallet", "seed phrase", "private key"],
    title: "Crypto wallet",
    domain: "fintech",
    followUps: [ASK.gas, ASK.dex, ASK.kyc],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A crypto wallet holds the keys that can move your tokens. It is not a bank account.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Keys, not a bank book" },
          {
            kind: "icons",
            items: [
              { icon: "wallet", label: "wallet", color: "yellow" },
              { icon: "key", label: "keys", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "The address is like an account number. The seed phrase is the key to the vault.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Number versus key" },
          { kind: "pair", left: "Address", right: "Seed", mark: "vs" },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "Your wallet signs a transaction. The network checks that signature, then moves the tokens.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Sign, then the network moves it" },
          {
            kind: "flow",
            steps: [{ label: "Sign" }, { label: "Check" }, { label: "Move" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "Anyone with the twelve or twenty-four words can spend the funds. There is usually no reset.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "The words spend the coins" },
          { kind: "icons", items: [{ icon: "lock", label: "no reset", color: "orange" }] },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "An exchange login is their account. A wallet phrase is yours alone to protect.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Exchange",
            leftBody: "Their account",
            rightTitle: "Your wallet",
            rightBody: "Your phrase",
          },
        ],
      },
    ],
  }),
  plan({
    id: "gas-fee",
    question: ASK.gas,
    aliases: ["gas fee", "gas", "network fee", "transaction fee"],
    title: "Gas fee",
    domain: "fintech",
    followUps: [ASK.wallet, ASK.dex, ASK.pool],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A gas fee pays the network to write your transaction into a block.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Postage for a transaction" },
          { kind: "icons", items: [{ icon: "coin", label: "gas", color: "orange" }] },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like postage on a letter. Busy days cost more than quiet ones.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Busy days cost more" },
          {
            kind: "bars",
            max: 10,
            items: [
              { label: "Quiet", value: 2 },
              { label: "Busy", value: 8 },
            ],
          },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "On Ethereum you pay in ether. The fee follows demand for block space, not a shop's menu.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Demand sets the fee" },
          {
            kind: "flow",
            steps: [{ label: "You send" }, { label: "Block space" }, { label: "Fee" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "Sending twenty dollars of a token might cost a few cents of postage, or several dollars.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "Same send, different postage" },
          {
            kind: "counters",
            items: [
              { to: 20, prefix: "$", label: "token", color: "blue" },
              { to: 4, prefix: "$", label: "or this fee", color: "orange" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "A failed transaction can still cost gas. You pay for the attempt, not a sure result.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Success",
            leftBody: "Fee still paid",
            rightTitle: "Failure",
            rightBody: "Fee can still apply",
          },
        ],
      },
    ],
  }),
  plan({
    id: "decentralized-exchange",
    question: ASK.dex,
    aliases: ["decentralized exchange", "dex", "dexes"],
    title: "Decentralized exchange",
    domain: "fintech",
    followUps: [ASK.pool, ASK.amm, ASK.wallet],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "A decentralized exchange lets you swap tokens from your wallet, with no company cashier.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Swap from your wallet" },
          {
            kind: "icons",
            items: [
              { icon: "wallet", label: "you", color: "yellow" },
              { icon: "coin", label: "swap", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like a row of vending machines on the sidewalk, not a store with a counter.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Machines, not a counter" },
          { kind: "icons", items: [{ icon: "cup", label: "machine", color: "white" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "Most are pools of tokens run by code. You connect a wallet, pick a pair, and swap.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Connect, pick, swap" },
          {
            kind: "flow",
            steps: [{ label: "Wallet" }, { label: "Pair" }, { label: "Swap" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "Trade a hundred dollars of ether for a dollar token. The pool shifts, and you pay a small fee.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "An example swap" },
          {
            kind: "counters",
            items: [
              { to: 100, prefix: "$", label: "ether", color: "yellow" },
              { to: 100, prefix: "$", label: "dollars", color: "blue" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "There is no help desk. A bad token or a bug can still take the money.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "No cashier",
            leftBody: "You hold the keys",
            rightTitle: "Still risky",
            rightBody: "Bugs and bad tokens",
          },
        ],
      },
    ],
  }),
  plan({
    id: "yield-farming",
    question: ASK.yield,
    aliases: ["yield farming", "yield farm", "liquidity mining"],
    title: "Yield farming",
    domain: "fintech",
    followUps: [ASK.apr, ASK.pool, ASK.il],
    scenes: [
      {
        id: "hook",
        role: "hook",
        narration: "Yield farming means moving tokens into pools to collect extra reward tokens.",
        durationMs: D[0],
        beats: [
          { kind: "title", text: "Chase extra reward tokens" },
          {
            kind: "icons",
            items: [
              { icon: "coin", label: "deposit", color: "yellow" },
              { icon: "percent", label: "reward", color: "green" },
            ],
          },
        ],
      },
      {
        id: "analogy",
        role: "analogy",
        narration: "Like chasing the market stall handing out the most coupons today.",
        durationMs: D[1],
        beats: [
          { kind: "title", text: "Today's coupon stall" },
          { kind: "icons", items: [{ icon: "person", label: "you", color: "white" }] },
        ],
      },
      {
        id: "mechanism",
        role: "mechanism",
        narration: "You might earn trading fees plus a token the project prints. That extra reward can fall fast.",
        durationMs: D[2],
        beats: [
          { kind: "title", text: "Fees plus a printed token" },
          {
            kind: "flow",
            steps: [{ label: "Deposit" }, { label: "Fees" }, { label: "Reward" }],
          },
        ],
      },
      {
        id: "example",
        role: "example",
        narration: "A screen showing four hundred percent can be real for a week and gone the next.",
        durationMs: D[3],
        beats: [
          { kind: "title", text: "A huge rate can vanish" },
          {
            kind: "counters",
            items: [
              { to: 400, suffix: "%", label: "this week", color: "yellow" },
              { to: 0, suffix: "%", label: "maybe next", color: "orange" },
            ],
          },
        ],
      },
      {
        id: "takeaway",
        role: "takeaway",
        narration: "The number is not a salary. A bug or a collapsing reward can take the deposit.",
        durationMs: D[4],
        beats: [
          {
            kind: "compare",
            leftTitle: "Not a salary",
            leftBody: "The rate can fall",
            rightTitle: "Deposit",
            rightBody: "Can still be lost",
          },
        ],
      },
    ],
  }),
]
