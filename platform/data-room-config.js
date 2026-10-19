/* Data room builder: stage-specific diligence checklists.
   Each item has a minStage; a stage shows its own items plus every earlier
   stage's items. "What good looks like" is template guidance, not legal
   advice. Stages: pre-seed, seed, series-a. */
var DATA_ROOM = {
  stages: [
    { key: "pre-seed", label: "Pre-seed" },
    { key: "seed", label: "Seed" },
    { key: "series-a", label: "Series A" }
  ],
  categories: ["Company", "Financials", "Legal", "Product & Tech", "Team", "Customers & GTM"],
  items: [
    { id: "incorporation", category: "Company", minStage: "pre-seed", title: "Certificate of incorporation + articles", detail: "The filed certificate and articles for your legal entity. One PDF, current version." },
    { id: "cap-table", category: "Company", minStage: "pre-seed", title: "Cap table", detail: "Every shareholder, shares held, % ownership, and vesting. Columns: Shareholder, Shares, % Owned, Vesting, Notes." },
    { id: "founder-agreements", category: "Company", minStage: "pre-seed", title: "Founder agreements + vesting", detail: "Signed founder agreements showing equity split and vesting schedule (usually 4 years, 1-year cliff)." },
    { id: "company-number", category: "Company", minStage: "pre-seed", title: "Company number + registered address", detail: "Legal name, company number, registered address, and jurisdiction. Keep it on the first page of the room." },
    { id: "board-minutes", category: "Company", minStage: "seed", title: "Board minutes + consents", detail: "Minutes or written consents for key decisions: financings, option grants, board changes." },
    { id: "shareholder-agreements", category: "Company", minStage: "seed", title: "Shareholder / investment agreements", detail: "Signed agreements from every prior round (SAFEs, notes, priced rounds) with key terms." },
    { id: "model", category: "Financials", minStage: "pre-seed", title: "Financial model", detail: "Monthly P&L, cash flow, and runway for 18-24 months. Assumptions on a separate tab, not hidden in formulas." },
    { id: "burn-plan", category: "Financials", minStage: "pre-seed", title: "Burn + runway plan", detail: "Monthly burn, cash in bank, and months of runway. Show the month you hit zero at current burn." },
    { id: "bank-statements", category: "Financials", minStage: "seed", title: "Bank statements (6 months)", detail: "Last 6 months of statements for every company account. Redact nothing an investor needs to reconcile." },
    { id: "management-accounts", category: "Financials", minStage: "seed", title: "Management accounts", detail: "Monthly P&L and balance sheet, reconciled to the bank. One file per month or one workbook." },
    { id: "tax-filings", category: "Financials", minStage: "series-a", title: "Tax filings", detail: "Filed returns for every year since incorporation, plus any open filings." },
    { id: "audited-accounts", category: "Financials", minStage: "series-a", title: "Audited accounts (if any)", detail: "Audited financials if you have them. If not, say so; do not substitute unaudited drafts." },
    { id: "ip-assignment", category: "Legal", minStage: "pre-seed", title: "IP assignment agreements", detail: "Signed IP assignment from every founder, employee, and contractor. No IP held in a personal name." },
    { id: "employment-contracts", category: "Legal", minStage: "pre-seed", title: "Employment + contractor contracts", detail: "Signed contracts for the team, with IP and confidentiality clauses." },
    { id: "trademarks", category: "Legal", minStage: "seed", title: "Trademarks + patents", detail: "Filings, registrations, and any pending applications. List the number, status, and jurisdiction." },
    { id: "material-contracts", category: "Legal", minStage: "seed", title: "Material contracts", detail: "Every major contract: customers, suppliers, leases, partnerships. Current signed versions." },
    { id: "gdpr", category: "Legal", minStage: "seed", title: "Data protection + privacy", detail: "Privacy policy, data-processing agreements, and how you handle personal data (GDPR / UK GDPR if you touch Europe)." },
    { id: "licences", category: "Legal", minStage: "series-a", title: "Regulatory licences + permits", detail: "Every licence your business needs, with expiry dates. If you are regulated, this is the first thing investors check." },
    { id: "demo", category: "Product & Tech", minStage: "pre-seed", title: "Product demo / walkthrough", detail: "A 3-5 minute recorded walkthrough or live demo link. Show the core workflow, not a slide deck." },
    { id: "roadmap", category: "Product & Tech", minStage: "pre-seed", title: "Product roadmap", detail: "What you built, what is next, and what you deliberately are not building. One page." },
    { id: "architecture", category: "Product & Tech", minStage: "seed", title: "Tech architecture overview", detail: "One diagram: services, data stores, third parties, and where customer data lives." },
    { id: "security", category: "Product & Tech", minStage: "series-a", title: "Security + penetration test", detail: "Your security posture, any penetration test report, and how you handle incidents." },
    { id: "founder-bios", category: "Team", minStage: "pre-seed", title: "Founder bios", detail: "One paragraph each: what you built before, why this problem, why this team." },
    { id: "org-chart", category: "Team", minStage: "seed", title: "Org chart + hiring plan", detail: "Current team, reporting lines, and the next 3-5 hires with the role each unlocks." },
    { id: "advisor-agreements", category: "Team", minStage: "seed", title: "Advisor agreements", detail: "Signed advisor agreements with equity, vesting, and scope. No handshake advisor equity." },
    { id: "key-hires", category: "Team", minStage: "series-a", title: "Key hires + retention", detail: "Who is critical, what they are paid, and what keeps them. Note any single points of failure." },
    { id: "customer-list", category: "Customers & GTM", minStage: "pre-seed", title: "Customer list + pipeline", detail: "Every customer and prospect: name, stage, value, next step. One sheet, current." },
    { id: "gtm-plan", category: "Customers & GTM", minStage: "pre-seed", title: "Go-to-market plan", detail: "Your channel, your ideal customer, and how you get the next 10 customers. One page, with numbers." },
    { id: "customer-contracts", category: "Customers & GTM", minStage: "seed", title: "Customer contracts / LOIs", detail: "Signed customer contracts, LOIs, and pilots. Current versions, with value and term." },
    { id: "pipeline-metrics", category: "Customers & GTM", minStage: "seed", title: "Pipeline + conversion metrics", detail: "Leads, meetings, trials, closes, and conversion at each step. Show the funnel, not just the total." },
    { id: "references", category: "Customers & GTM", minStage: "series-a", title: "Customer references", detail: "2-3 customers willing to speak to an investor. Name, role, and what they will confirm." }
  ]
};
