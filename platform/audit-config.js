/* Audit (deck rater) scoring config.
   The 10 dimensions are grounded in two published frameworks:
   Sequoia Capital's 10-slide framework (Company Purpose, Problem, Solution,
   Why Now, Market Potential, Competition, Product, Business Model, Team,
   Financials) and Y Combinator's published application criteria (founders
   first, clear problem in plain language, specific traction numbers,
   founder-market fit, how you get users, how much you are raising).
   Each dimension has 4 transparent checks. A check passes when any of its
   patterns matches the deck text (case-insensitive), or when its
   special test passes. Score per dimension = 1 + checks passed (1 to 5).
   The score checks whether the deck ANSWERS the questions Sequoia and YC
   ask, not whether the answers are true or compelling. Not affiliated with
   or endorsed by Sequoia or Y Combinator.
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
    { min: 80, max: 100, label: "Investor-ready", description: "Minor polish, then pitch." },
    { min: 55, max: 79, label: "Strong with leaks", description: "Fix the top 3 leaks, then pitch." },
    { min: 30, max: 54, label: "Needs work", description: "Do not pitch yet. Fix the leaks first." },
    { min: 0, max: 29, label: "Not ready", description: "Rebuild the narrative first." }
  ],
  dimensions: [
    {
      key: "team",
      name: "Team",
      source: "Sequoia + YC",
      sourceNote: "Sequoia asks for the founders' story. YC funds founders first and asks why this team.",
      definition: "Can this team build it and sell it?",
      leak: "YC funds founders first. No proof this team can build and sell this.",
      fix: "Show founder-market fit, relevant wins, and who builds vs who sells.",
      checks: [
        { id: "team_founders", label: "Names the founders", anyOf: ["\\bfounders?\\b", "co-?founder", "\\bCEO\\b"] },
        { id: "team_experience", label: "Shows relevant experience or a track record", anyOf: ["experience", "previously", "formerly", "track record", "\\bex-\\w+"] },
        { id: "team_fit", label: "Shows founder-market fit: why this team", anyOf: ["founder-market", "why us", "why we", "our background", "domain expertise", "we lived", "we experienced", "we saw"] },
        { id: "team_builder", label: "Names a technical builder", anyOf: ["\\bCTO\\b", "engineer", "technical", "developer", "\\bbuilt\\b"] }
      ]
    },
    {
      key: "problem",
      name: "Problem",
      source: "Sequoia + YC",
      sourceNote: "Sequoia: the pain customers feel and the shortcomings of current solutions. YC: state the problem in plain language.",
      definition: "Is the problem painful, urgent, and expensive?",
      leak: "The problem reads as an inconvenience, not a painful, expensive urgency.",
      fix: "Reframe around cost of inaction: who bleeds, how much, how often.",
      checks: [
        { id: "problem_pain", label: "States the customer pain in plain language", anyOf: ["\\bproblem\\b", "\\bpain\\b", "painful", "struggl", "frustrat", "wast"] },
        { id: "problem_who", label: "Names who has the problem", anyOf: ["customer", "users?", "\\bteams?\\b", "businesses", "companies", "founders"] },
        { id: "problem_number", label: "Quantifies the pain with a number", test: "hasNumber" },
        { id: "problem_statusquo", label: "Names the shortcomings of current solutions", anyOf: ["currently", "existing", "spreadsheet", "manual", "status quo", "workaround", "today they"] }
      ]
    },
    {
      key: "market",
      name: "Market",
      source: "Sequoia + YC",
      sourceNote: "Sequoia: identify the customer and the market (TAM/SAM/SOM), bottom-up. YC: the market must be large.",
      definition: "Is the market big enough and reachable?",
      leak: "Market sizing reads as top-down guesswork, not bottom-up arithmetic.",
      fix: "Rebuild bottom-up: reachable buyers times price, with sources a partner can check.",
      checks: [
        { id: "market_size", label: "States a market size (TAM, SAM, SOM)", anyOf: ["\\bTAM\\b", "\\bSAM\\b", "\\bSOM\\b", "market size", "market is", "market of"] },
        { id: "market_beachhead", label: "Names a beachhead or ideal customer", anyOf: ["beachhead", "\\bICP\\b", "ideal customer", "segment", "niche", "target market"] },
        { id: "market_growth", label: "Shows the market is growing", anyOf: ["grow", "growing", "growth", "\\bCAGR\\b", "expanding", "increas"] },
        { id: "market_bottomup", label: "Sizes bottom-up (customers times price)", anyOf: ["per user", "per month", "per seat", "\\bACV\\b", "contract value", "per customer"] }
      ]
    },
    {
      key: "product",
      name: "Solution & Product",
      source: "Sequoia",
      sourceNote: "Sequoia: one declarative Company Purpose, then the Solution and the Product.",
      definition: "Does the product solve the problem in a way customers pay for?",
      leak: "No one-line purpose, and the product reads as features, not a solution.",
      fix: "Open with one line: what you do, for whom, to what outcome. Then show how it works.",
      checks: [
        { id: "product_purpose", label: "States what the company does (Sequoia Company Purpose)", anyOf: ["we help", "we enable", "we allow", "we provide", "we make", "we build", "we offer", "helps", "enables"] },
        { id: "product_works", label: "Shows how it works", anyOf: ["how it works", "workflow", "data flows", "dashboard", "steps", "platform"] },
        { id: "product_usecase", label: "Names a concrete use case", anyOf: ["use case", "for example", "\\be\\.g\\.", "example"] },
        { id: "product_diff", label: "States what makes it different", anyOf: ["unlike", "unique", "proprietary", "different", "\\bonly\\b", "first"] }
      ]
    },
    {
      key: "traction",
      name: "Traction",
      source: "YC",
      sourceNote: "YC: real users, specific revenue and growth numbers, week-over-week growth.",
      definition: "Is there evidence customers want it and stay?",
      leak: "YC wants real users and specific numbers. This reads as vanity metrics.",
      fix: "Replace signups with revenue, cohorts, retention, and growth.",
      checks: [
        { id: "traction_users", label: "Names real users or customers", anyOf: ["users", "customers", "paying", "pilot", "waitlist", "signups", "sign-ups"] },
        { id: "traction_revenue", label: "Shows revenue", anyOf: ["revenue", "\\bMRR\\b", "\\bARR\\b", "paying customers", "\\$\\s?\\d"] },
        { id: "traction_growth", label: "Shows growth or retention", anyOf: ["grow", "growth", "growing", "\\bMoM\\b", "week-over-week", "retention", "churn", "\\bWoW\\b"] },
        { id: "traction_proof", label: "Names proof: pilot, LOI, or testimonial", anyOf: ["pilot", "\\bLOI\\b", "letter of intent", "testimonial", "case study", "validated"] }
      ]
    },
    {
      key: "business_model",
      name: "Business model",
      source: "Sequoia",
      sourceNote: "Sequoia: how you make money, and the unit economics.",
      definition: "Does the unit economics work?",
      leak: "Unit economics are unclear: no payback, margin, or cash-efficiency logic.",
      fix: "State payback, gross margin, and cash efficiency per customer.",
      checks: [
        { id: "model_how", label: "Names how it makes money", anyOf: ["subscription", "revenue model", "we charge", "monetiz", "we make money"] },
        { id: "model_pricing", label: "States a price point", anyOf: ["[$£]\\s?\\d+[^\\n]{0,40}(\\/month|\\/user|\\/year|per month|per user|per year)", "pricing", "price"] },
        { id: "model_unit", label: "Shows unit economics", anyOf: ["unit economics", "\\bCAC\\b", "\\bLTV\\b", "payback", "gross margin", "cost to acquire"] },
        { id: "model_path", label: "Shows a path to profitability or scale", anyOf: ["profitable", "profitability", "break-even", "breakeven", "path to", "\\bscale\\b"] }
      ]
    },
    {
      key: "go_to_market",
      name: "Go-to-market",
      source: "YC",
      sourceNote: "YC asks how you get users. Investors test whether distribution is repeatable.",
      definition: "Is there a repeatable path to customers?",
      leak: "No repeatable path to customers: growth reads as hope, not a channel.",
      fix: "Name one repeatable channel, its cost, and its conversion.",
      checks: [
        { id: "gtm_acquire", label: "Names how you acquire customers", anyOf: ["outbound", "inbound", "partnership", "channel", "acquisition", "distribution", "sales-led", "product-led"] },
        { id: "gtm_icp", label: "Names the ideal customer", anyOf: ["\\bICP\\b", "ideal customer", "target customer", "segment", "mid-market", "\\bSMB\\b", "enterprise"] },
        { id: "gtm_repeatable", label: "Shows a repeatable playbook", anyOf: ["playbook", "repeatable", "pipeline", "funnel", "sales motion", "motion"] },
        { id: "gtm_first", label: "Names a first channel or first customers", anyOf: ["beachhead", "first customers", "initial", "launch", "first 10", "first 100"] }
      ]
    },
    {
      key: "competition",
      name: "Competition",
      source: "Sequoia",
      sourceNote: "Sequoia: direct and indirect competitors, and your edge.",
      definition: "Is the moat real against incumbents and copycats?",
      leak: "Moat reads as assertion: no switching costs, data flywheel, or defensibility.",
      fix: "Name the moat mechanism: data, switching costs, distribution, or network.",
      checks: [
        { id: "comp_direct", label: "Names direct competitors", anyOf: ["competitor", "competing", "incumbent", "rival"] },
        { id: "comp_statusquo", label: "Names the status quo alternative", anyOf: ["spreadsheet", "manual", "status quo", "doing nothing", "in-house", "existing solution"] },
        { id: "comp_moat", label: "States a durable edge or moat", anyOf: ["moat", "defensib", "switching cost", "network effect", "flywheel", "patent", "data advantage"] },
        { id: "comp_win", label: "Shows why you win vs. them", anyOf: ["unlike", "we win", "beat", "better than", "advantage", "differentiat"] }
      ]
    },
    {
      key: "financials_ask",
      name: "Financials / Ask",
      source: "Sequoia + YC",
      sourceNote: "Sequoia: financials and the funding ask. YC: how much you are raising and why.",
      definition: "Is the round sized to real milestones?",
      leak: "The ask reads as a number, not a milestone budget that unlocks the next round.",
      fix: "Tie every pound to a milestone that unlocks Series A metrics.",
      checks: [
        { id: "ask_raising", label: "States the funding ask", anyOf: ["raising", "we are raising", "\\bround\\b", "pre-seed", "seed round", "Series A"] },
        { id: "ask_use", label: "States use of funds", anyOf: ["use of funds", "use of proceeds", "hiring", "runway", "milestones", "allocation"] },
        { id: "ask_milestones", label: "States milestones the round buys", anyOf: ["milestone", "target", "goal", "by 20", "18 months", "12 months", "\\bARR\\b"] },
        { id: "ask_runway", label: "Shows runway or a financial plan", anyOf: ["runway", "burn", "financial", "projection", "forecast", "cash"] }
      ]
    },
    {
      key: "why_now",
      name: "Why Now",
      source: "Sequoia",
      sourceNote: "Sequoia: why hasn't this been built before now? What changed?",
      definition: "Why is this the moment?",
      leak: "No why-now: nothing says what changed to make this the moment.",
      fix: "Name the shift (technology, regulation, behavior) and why it was not possible before.",
      checks: [
        { id: "why_shift", label: "Names a market, technology, or regulatory shift", anyOf: ["shift", "change", "regulation", "regulatory", "new law", "behavior", "adoption", "inflection", "trend", "disruption"] },
        { id: "why_moment", label: "States why this moment is the right time", anyOf: ["why now", "right now", "right time", "timing", "this moment", "the time is", "moment"] },
        { id: "why_before", label: "Explains why this was not built before", anyOf: ["before", "previously", "until now", "never been", "first time", "finally possible", "now possible"] },
        { id: "why_enabler", label: "Names a specific enabling change", anyOf: ["\\bAI\\b", "artificial intelligence", "\\bLLM\\b", "regulation", "regulatory", "cost fell", "cost drop", "new platform", "\\bAPI\\b", "mobile", "cloud", "open banking", "blockchain"] }
      ]
    }
  ]
};
