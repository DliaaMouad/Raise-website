/* Audit (Investor-Ready diagnostic) scoring config.
   Tune here: dimensions, scale, bands, leak lines, fix lines, service links.
   Service values marked [FILL IN] are placeholders until connected. */
var AUDIT_CONFIG = {
  service: {
    calComUrl: "https://cal.com/mouad-dliaa/15min",
    supabaseUrl: "[FILL IN: Supabase project URL]",
    supabaseAnonKey: "[FILL IN: Supabase anon key]",
    kitFormId: "[FILL IN: Kit form ID]",
    stripeAuditUrl: "[FILL IN: Stripe Payment Link for the Deck Audit]"
  },
  scale: [
    { value: 1, label: "Missing", desc: "Not addressed in the deck." },
    { value: 2, label: "Weak", desc: "Mentioned but vague or unproven." },
    { value: 3, label: "Adequate", desc: "Present but would not survive partner scrutiny." },
    { value: 4, label: "Strong", desc: "Clear and evidence-backed." },
    { value: 5, label: "Investor-ready", desc: "Would survive a partner meeting." }
  ],
  bands: [
    { min: 42, max: 50, label: "Investor-ready", description: "Minor polish, then pitch." },
    { min: 32, max: 41, label: "Strong with leaks", description: "Fix the top 3 leaks, then pitch." },
    { min: 22, max: 31, label: "Needs work", description: "Do not pitch yet. Fix the leaks first." },
    { min: 10, max: 21, label: "Not ready", description: "Rebuild the narrative first." }
  ],
  dimensions: [
    {
      key: "team",
      name: "Team",
      definition: "Can this team build it and sell it?",
      question: "How strong is your team's proof that you can build and sell this?",
      leak: "Investors back teams, not slides. No proof you can build and sell this.",
      fix: "Show proof: shipped product, domain depth, prior wins, and who sells."
    },
    {
      key: "problem",
      name: "Problem",
      definition: "Is the problem painful, urgent, and expensive?",
      question: "How painful, urgent, and expensive is the problem for your buyer?",
      leak: "The problem reads as an inconvenience, not a painful, expensive urgency.",
      fix: "Reframe around cost of inaction: who bleeds, how much, how often."
    },
    {
      key: "market",
      name: "Market",
      definition: "Is the market big enough and reachable?",
      question: "How big is your reachable market, and how did you size it?",
      leak: "Market sizing reads as top-down guesswork, not bottom-up arithmetic.",
      fix: "Rebuild bottom-up: reachable buyers times price, with sources a partner can check."
    },
    {
      key: "product",
      name: "Product",
      definition: "Does the product solve the problem in a way customers pay for?",
      question: "How clearly does your product solve the problem for a paying customer?",
      leak: "The product reads as features, not a solution a customer pays for.",
      fix: "Lead with the outcome for one buyer, then the mechanism, then the proof."
    },
    {
      key: "traction",
      name: "Traction",
      definition: "Is there evidence customers want it and stay?",
      question: "How strong is your evidence that customers want it and stay?",
      leak: "Traction reads as vanity metrics, not retention and customer velocity.",
      fix: "Replace signups with cohorts, retention, and customer velocity."
    },
    {
      key: "business_model",
      name: "Business model",
      definition: "Does the unit economics work?",
      question: "How clearly do your unit economics work (payback, margins, cash efficiency)?",
      leak: "Unit economics are unclear: no payback, margin, or cash-efficiency logic.",
      fix: "State payback, gross margin, and cash efficiency per customer."
    },
    {
      key: "go_to_market",
      name: "Go-to-market",
      definition: "Is there a repeatable path to customers?",
      question: "How repeatable is your path to the next 100 customers?",
      leak: "No repeatable path to customers: growth reads as hope, not a channel.",
      fix: "Name one repeatable channel, its cost, and its conversion."
    },
    {
      key: "competition",
      name: "Competition",
      definition: "Is the moat real against incumbents and copycats?",
      question: "How defensible are you against incumbents and copycats?",
      leak: "Moat reads as assertion: no switching costs, data flywheel, or defensibility.",
      fix: "Name the moat mechanism: data, switching costs, distribution, or network."
    },
    {
      key: "financials_ask",
      name: "Financials / Ask",
      definition: "Is the round sized to real milestones?",
      question: "How credibly does your round size map to milestones that unlock the next round?",
      leak: "The ask reads as a number, not a milestone budget that unlocks the next round.",
      fix: "Tie every pound to a milestone that unlocks Series A metrics."
    },
    {
      key: "narrative_clarity",
      name: "Narrative clarity",
      definition: "Can an investor retell the story in one sentence?",
      question: "Could an investor retell your story in one sentence after one read?",
      leak: "The story cannot be retold in one sentence, so partners cannot pitch it internally.",
      fix: "Compress the story to one sentence: who, what pain, why now, why you."
    }
  ]
};
