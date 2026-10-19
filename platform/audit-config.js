/* Audit (deck rater) scoring config.
   Each dimension has 4 transparent checks. A check passes when any of its
   patterns matches the deck text (case-insensitive), or when its
   special test passes. Score per dimension = 1 + checks passed (1 to 5).
   Tune here: checks, scale, bands, leak lines, fix lines, service links.
   Service values marked [FILL IN] are placeholders until connected. */
var AUDIT_CONFIG = {
  service: {
    calComUrl: "https://cal.com/mouad-dliaa/15min",
    supabaseUrl: "[FILL IN: Supabase project URL]",
    supabaseAnonKey: "[FILL IN: Supabase anon key]",
    kitFormId: "[FILL IN: Kit form ID]",
    stripeAuditUrl: "[FILL IN: Stripe Payment Link for the Deck Audit]"
  },
  minWords: 50,
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
      leak: "Investors back teams, not slides. No proof you can build and sell this.",
      fix: "Show proof: shipped product, domain depth, prior wins, and who sells.",
      checks: [
        { id: "team_people", label: "Names the team or founders", anyOf: ["\\bfounders?\\b", "\\bteam\\b", "\\bCEO\\b", "co-?founder"] },
        { id: "team_experience", label: "Shows prior experience or track record", anyOf: ["experience", "previously", "formerly", "track record", "background", "\\bex-\\w+"] },
        { id: "team_roles", label: "Names roles or functions", anyOf: ["\\bCTO\\b", "\\bCPO\\b", "\\bCOO\\b", "head of", "\\bVP\\b", "\\bchief\\b"] },
        { id: "team_advisors", label: "Mentions advisors, board, or hiring", anyOf: ["advisor", "advisory", "\\bboard\\b", "hiring", "\\bhire\\b"] }
      ]
    },
    {
      key: "problem",
      name: "Problem",
      definition: "Is the problem painful, urgent, and expensive?",
      leak: "The problem reads as an inconvenience, not a painful, expensive urgency.",
      fix: "Reframe around cost of inaction: who bleeds, how much, how often.",
      checks: [
        { id: "problem_stated", label: "States a problem or pain", anyOf: ["\\bproblem\\b", "\\bpain\\b", "painful", "challenge", "struggl", "frustrat"] },
        { id: "problem_cost", label: "Shows the problem costs time or money", anyOf: ["\\bcost\\b", "costs", "expensive", "los(e|ing)", "wast", "inefficien"] },
        { id: "problem_who", label: "Names who has the problem", anyOf: ["customer", "users?", "businesses", "companies", "teams", "founders"] },
        { id: "problem_urgency", label: "Shows urgency or frequency", anyOf: ["urgent", "critical", "every day", "daily", "weekly", "recurring", "cannot", "unable"] }
      ]
    },
    {
      key: "market",
      name: "Market",
      definition: "Is the market big enough and reachable?",
      leak: "Market sizing reads as top-down guesswork, not bottom-up arithmetic.",
      fix: "Rebuild bottom-up: reachable buyers times price, with sources a partner can check.",
      checks: [
        { id: "market_size", label: "States a market size with a number", anyOf: ["[$£]\\s?\\d+(\\.\\d+)?\\s?(billion|million|bn|trillion)", "\\bTAM\\b", "\\bSAM\\b", "\\bSOM\\b", "market size"] },
        { id: "market_segment", label: "Names a segment or beachhead", anyOf: ["segment", "beachhead", "niche", "target market", "addressable", "initial market"] },
        { id: "market_growth", label: "Shows market growth", anyOf: ["growing", "growth", "\\bCAGR\\b", "expanding", "increas"] },
        { id: "market_scope", label: "Names a geography or scope", anyOf: ["global", "worldwide", "international", "Europe", "region", "United States", "United Kingdom", "\\bUS\\b", "\\bUK\\b"] }
      ]
    },
    {
      key: "product",
      name: "Product",
      definition: "Does the product solve the problem in a way customers pay for?",
      leak: "The product reads as features, not a solution a customer pays for.",
      fix: "Lead with the outcome for one buyer, then the mechanism, then the proof.",
      checks: [
        { id: "product_action", label: "Says what the product does for the user", anyOf: ["we help", "we enable", "we allow", "we provide", "helps", "enables", "allows"] },
        { id: "product_mechanism", label: "Explains how it works", anyOf: ["how it works", "workflow", "process", "automat", "engine", "algorithm", "\\bAI\\b", "platform"] },
        { id: "product_benefit", label: "States a benefit or outcome", anyOf: ["save", "reduc", "increase", "improve", "faster", "outcome", "results", "benefit"] },
        { id: "product_diff", label: "States what makes it different", anyOf: ["unlike", "different", "only", "unique", "first", "proprietary", "patent"] }
      ]
    },
    {
      key: "traction",
      name: "Traction",
      definition: "Is there evidence customers want it and stay?",
      leak: "Traction reads as vanity metrics, not retention and customer velocity.",
      fix: "Replace signups with cohorts, retention, and customer velocity.",
      checks: [
        { id: "traction_metric", label: "Names a traction metric", anyOf: ["revenue", "\\bMRR\\b", "\\bARR\\b", "users", "customers", "signups", "sign-ups", "downloads", "paying"] },
        { id: "traction_growth", label: "Shows growth", anyOf: ["growth", "grew", "growing", "\\bMoM\\b", "month-over-month", "\\bYoY\\b", "year-over-year", "%"] },
        { id: "traction_retention", label: "Shows retention or repeat use", anyOf: ["retention", "retained", "churn", "renewal", "cohort", "repeat", "\\bLTV\\b", "\\bNPS\\b"] },
        { id: "traction_proof", label: "Shows external proof", anyOf: ["pilot", "\\bLOI\\b", "letter of intent", "waitlist", "pre-order", "partnership", "case study", "testimonial"] }
      ]
    },
    {
      key: "business_model",
      name: "Business model",
      definition: "Does the unit economics work?",
      leak: "Unit economics are unclear: no payback, margin, or cash-efficiency logic.",
      fix: "State payback, gross margin, and cash efficiency per customer.",
      checks: [
        { id: "model_pricing", label: "States how it charges", anyOf: ["pricing", "price", "subscription", "per user", "per month", "per seat", "revenue model", "monetiz", "charge", "\\bfee\\b"] },
        { id: "model_unit", label: "Shows unit economics", anyOf: ["unit economics", "\\bCAC\\b", "\\bLTV\\b", "payback", "margin", "cost to acquire", "cost per"] },
        { id: "model_margin", label: "Mentions margin or profitability", anyOf: ["margin", "profit", "profitable"] },
        { id: "model_pricepoint", label: "States a price point", anyOf: ["[$£]\\s?\\d+[^\\n]{0,40}(\\/month|\\/user|\\/year|per month|per user|per year)"] }
      ]
    },
    {
      key: "go_to_market",
      name: "Go-to-market",
      definition: "Is there a repeatable path to customers?",
      leak: "No repeatable path to customers: growth reads as hope, not a channel.",
      fix: "Name one repeatable channel, its cost, and its conversion.",
      checks: [
        { id: "gtm_channel", label: "Names a channel", anyOf: ["channel", "outbound", "inbound", "partnerships", "distribution", "direct sales", "self-serve", "product-led", "\\bPLG\\b", "content", "\\bSEO\\b", "\\bads\\b", "paid"] },
        { id: "gtm_acquire", label: "Describes how customers are acquired", anyOf: ["acqui", "onboard", "funnel", "conversion", "pipeline"] },
        { id: "gtm_repeatable", label: "Shows a repeatable or scalable motion", anyOf: ["scalable", "repeatable", "playbook", "pipeline", "systematic", "process"] },
        { id: "gtm_target", label: "Names the target customer", anyOf: ["target", "\\bICP\\b", "ideal customer", "segment", "vertical", "persona"] }
      ]
    },
    {
      key: "competition",
      name: "Competition",
      definition: "Is the moat real against incumbents and copycats?",
      leak: "Moat reads as assertion: no switching costs, data flywheel, or defensibility.",
      fix: "Name the moat mechanism: data, switching costs, distribution, or network.",
      checks: [
        { id: "comp_named", label: "Names competitors or alternatives", anyOf: ["competitor", "compete", "competing", "alternative", "incumbent"] },
        { id: "comp_moat", label: "States a moat", anyOf: ["moat", "defensib", "switching cost", "network effect", "data flywheel", "proprietary", "barrier"] },
        { id: "comp_compare", label: "Compares against competitors", anyOf: ["unlike", "versus", "\\bvs\\.?\\b", "compared", "comparison", "better than", "advantage", "\\bedge\\b"] },
        { id: "comp_win", label: "States why it wins", anyOf: ["\\bwin\\b", "winning", "win rate", "defensible", "unfair advantage", "differentiat"] }
      ]
    },
    {
      key: "financials_ask",
      name: "Financials / Ask",
      definition: "Is the round sized to real milestones?",
      leak: "The ask reads as a number, not a milestone budget that unlocks the next round.",
      fix: "Tie every pound to a milestone that unlocks Series A metrics.",
      checks: [
        { id: "ask_stated", label: "States it is raising", anyOf: ["raising", "seeking", "\\bround\\b", "pre-seed", "seed round", "raise"] },
        { id: "ask_amount", label: "States a raise amount", anyOf: ["[$£]\\s?\\d+(\\.\\d+)?\\s?(million|billion|m\\b|k\\b)"] },
        { id: "ask_use", label: "States use of funds or runway", anyOf: ["use of funds", "allocation", "allocate", "budget", "runway", "months"] },
        { id: "ask_milestones", label: "States milestones or a roadmap", anyOf: ["milestone", "roadmap", "next 12", "next 18", "by 202", "Q[1-4]"] }
      ]
    },
    {
      key: "narrative_clarity",
      name: "Narrative clarity",
      definition: "Can an investor retell the story in one sentence?",
      leak: "The story cannot be retold in one sentence, so partners cannot pitch it internally.",
      fix: "Compress the story to one sentence: who, what pain, why now, why you.",
      checks: [
        { id: "narr_concise", label: "Deck text is concise (under 1,500 words)", test: "wordCountMax", max: 1500 },
        { id: "narr_problem_early", label: "Problem stated in the first 20% of the deck", test: "earlyMention", anyOf: ["\\bproblem\\b", "\\bpain\\b"], fraction: 0.2 },
        { id: "narr_sections", label: "At least 4 deck sections named", test: "sectionCount", anyOf: ["problem", "solution", "market", "product", "traction", "team", "business model", "go-to-market", "competition", "financials", "ask", "round"], min: 4 },
        { id: "narr_numbers", label: "Specific numbers present ($, £, or %)", test: "hasNumber" }
      ]
    }
  ]
};
