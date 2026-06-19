import { rankCareerDirections } from "./career-directions";

export type GrowthDirection = "deeper" | "wider" | "adjacent";

export interface ProfessionDestination {
  id: string;
  title: string;
  durationMonths: number;
  rationale: string;
  skills: string[];
  growthDirection: GrowthDirection;
}

export interface ProfessionMilestoneTemplate {
  key: string;
  title: string;
  description: string;
}

export interface ProfessionCluster {
  code: string;
  label: string;
  aliases: string[];
  signals: string[];
  strengths: string[];
  gaps: string[];
  destinations: ProfessionDestination[];
  milestones: ProfessionMilestoneTemplate[];
  resources: string[];
}

const clusters: ProfessionCluster[] = [
  {
    code: "food-hospitality",
    label: "Food and hospitality operations",
    aliases: [
      "chef",
      "head chef",
      "executive chef",
      "restaurant manager",
      "restaurant owner",
      "cafe owner",
      "catering manager",
      "food business owner",
      "bakery owner",
      "hospitality manager",
      "hotel operations manager",
      "f&b manager",
    ],
    signals: [
      "restaurant",
      "hospitality",
      "kitchen",
      "catering",
      "food safety",
      "menu",
      "covers",
      "food cost",
      "front of house",
      "back of house",
      "supplier",
      "inventory",
      "waste management",
    ],
    strengths: [
      "unit-level commercial judgement",
      "supplier negotiation",
      "staff scheduling",
      "service recovery",
      "inventory and waste control",
    ],
    gaps: [
      "unit economics and margin control",
      "operations that run without the owner present",
      "brand differentiation",
      "multi-site compliance",
      "platform and partnership negotiation",
    ],
    destinations: [
      {
        id: "food-multi-unit-operations",
        title: "Multi-unit Operations Manager",
        durationMonths: 12,
        growthDirection: "wider",
        rationale:
          "Use proven unit operations experience to lead performance across several locations.",
        skills: [
          "Multi-site operations",
          "Unit economics",
          "Manager coaching",
          "Compliance",
        ],
      },
      {
        id: "food-franchise-developer",
        title: "Franchise Developer",
        durationMonths: 18,
        growthDirection: "wider",
        rationale:
          "Turn a repeatable food-service model into documented systems that other operators can run.",
        skills: [
          "Franchise systems",
          "Commercial modelling",
          "Operations manuals",
          "Partner selection",
        ],
      },
      {
        id: "food-cpg-founder",
        title: "Food Brand / CPG Founder",
        durationMonths: 18,
        growthDirection: "adjacent",
        rationale:
          "Convert product and customer insight into a packaged range that can scale beyond one venue.",
        skills: [
          "Product development",
          "Retail margins",
          "Brand positioning",
          "Supply chain",
        ],
      },
      {
        id: "food-hospitality-consultant",
        title: "Hospitality Consultant",
        durationMonths: 9,
        growthDirection: "adjacent",
        rationale:
          "Package operational know-how into measurable advice for hospitality businesses.",
        skills: [
          "Operational audits",
          "Client discovery",
          "Financial diagnosis",
          "Service design",
        ],
      },
      {
        id: "food-digital-entrepreneur",
        title: "Digital Food Entrepreneur",
        durationMonths: 9,
        growthDirection: "adjacent",
        rationale:
          "Apply food operations experience to delivery-first, content-led, or virtual-brand models.",
        skills: [
          "Delivery economics",
          "Digital acquisition",
          "Menu engineering",
          "Audience building",
        ],
      },
    ],
    milestones: [
      {
        key: "unit-economics",
        title: "Build a unit economics dashboard",
        description:
          "Track food cost, labour percentage, margin per cover, and waste for eight consecutive weeks.",
      },
      {
        key: "operations-scaling",
        title: "Document one manager-run operating system",
        description:
          "Write and test opening, closing, ordering, and escalation procedures without relying on the owner.",
      },
      {
        key: "customer-growth",
        title: "Run a measured repeat-customer experiment",
        description:
          "Improve repeat visits or orders with a loyalty or feedback loop and record the result.",
      },
      {
        key: "brand-system",
        title: "Define a consistent food brand system",
        description:
          "Apply one clear brand position across menu, venue or packaging, and digital channels.",
      },
      {
        key: "partnership",
        title: "Complete one commercial partner negotiation",
        description:
          "Negotiate a supplier, delivery platform, retail, or franchise agreement using documented margin targets.",
      },
      {
        key: "scale-compliance",
        title: "Confirm target-scale compliance requirements",
        description:
          "Create a checklist for the licences, food-safety controls, and records required at the target scale.",
      },
    ],
    resources: [
      "Local food-safety regulator guidance",
      "Hospitality unit economics worksheet",
      "Operations manual template",
    ],
  },
  {
    code: "k12-education",
    label: "K-12 education",
    aliases: [
      "teacher",
      "classroom teacher",
      "subject lead",
      "head of department",
      "form tutor",
      "senco",
      "teaching assistant",
      "instructional coach",
    ],
    signals: [
      "school",
      "classroom",
      "students",
      "pupils",
      "curriculum",
      "lesson planning",
      "assessment",
      "pastoral",
      "teaching",
      "exam board",
      "special educational needs",
    ],
    strengths: [
      "curriculum sequencing",
      "differentiated instruction",
      "behaviour management",
      "parent and leadership communication",
      "data-informed intervention",
    ],
    gaps: [
      "curriculum strategy ownership",
      "assessment authorship and moderation",
      "line management",
      "programme or budget ownership",
      "evidence-led use of education technology",
    ],
    destinations: [
      {
        id: "education-curriculum-leader",
        title: "Head of Department / Curriculum Leader",
        durationMonths: 12,
        growthDirection: "wider",
        rationale:
          "Move from strong classroom practice to ownership of subject strategy, standards, and staff development.",
        skills: [
          "Curriculum strategy",
          "Assessment moderation",
          "Teacher coaching",
          "Outcome analysis",
        ],
      },
      {
        id: "education-deputy-head",
        title: "Assistant / Deputy Headteacher",
        durationMonths: 24,
        growthDirection: "wider",
        rationale:
          "Build whole-school leadership evidence across people, improvement priorities, and operations.",
        skills: [
          "School improvement",
          "Line management",
          "Safeguarding leadership",
          "Budget ownership",
        ],
      },
      {
        id: "education-edtech-specialist",
        title: "Educational Technology Specialist",
        durationMonths: 9,
        growthDirection: "adjacent",
        rationale:
          "Combine classroom credibility with implementation and evaluation of learning technology.",
        skills: [
          "Edtech evaluation",
          "Teacher enablement",
          "Digital strategy",
          "Learning analytics",
        ],
      },
      {
        id: "education-programme-manager",
        title: "Education Programme Manager",
        durationMonths: 12,
        growthDirection: "adjacent",
        rationale:
          "Transfer curriculum and stakeholder skills into education programmes for government, charities, or providers.",
        skills: [
          "Programme delivery",
          "Budgeting",
          "Partner management",
          "Impact measurement",
        ],
      },
      {
        id: "education-instructional-designer",
        title: "Instructional Designer",
        durationMonths: 9,
        growthDirection: "adjacent",
        rationale:
          "Use learning design and assessment expertise to create structured digital or workplace learning.",
        skills: [
          "Learning design",
          "Authoring tools",
          "Assessment design",
          "Content production",
        ],
      },
    ],
    milestones: [
      {
        key: "curriculum-leadership",
        title: "Lead one curriculum improvement cycle",
        description:
          "Redesign, implement, and review a unit or subject sequence with documented pupil outcomes.",
      },
      {
        key: "assessment-design",
        title: "Author and moderate an assessment",
        description:
          "Create a rubric or assessment, pilot it, and complete moderation with another teacher.",
      },
      {
        key: "education-technology",
        title: "Run an evidence-led edtech pilot",
        description:
          "Use one platform for a full teaching cycle and report its effect on engagement or attainment.",
      },
      {
        key: "programme-management",
        title: "Coordinate a cross-staff education initiative",
        description:
          "Own the timeline, responsibilities, and outcome reporting for an initiative involving at least three colleagues.",
      },
      {
        key: "professional-accreditation",
        title: "Start the relevant leadership accreditation",
        description:
          "Identify the recognised qualification for the target role and complete its first assessed component.",
      },
      {
        key: "mentorship",
        title: "Complete a documented mentoring cycle",
        description:
          "Coach a trainee or early-career teacher through agreed goals and recorded review points.",
      },
    ],
    resources: [
      "Relevant teaching standards framework",
      "School improvement planning template",
      "Professional qualification guidance",
    ],
  },
  {
    code: "healthcare-nursing",
    label: "Healthcare nursing",
    aliases: [
      "nurse",
      "staff nurse",
      "registered nurse",
      "charge nurse",
      "ward sister",
      "clinical nurse specialist",
      "healthcare assistant",
      "practice development nurse",
    ],
    signals: [
      "patient care",
      "clinical",
      "ward",
      "nursing",
      "medicines",
      "care plan",
      "multidisciplinary",
      "revalidation",
      "preceptorship",
      "hospital",
      "community care",
    ],
    strengths: [
      "clinical risk assessment",
      "multidisciplinary coordination",
      "high-stress communication",
      "protocol governance",
      "shift resource management",
    ],
    gaps: [
      "target-role clinical competencies",
      "leadership span",
      "quality-improvement delivery",
      "preceptorship experience",
      "clinical informatics for digital roles",
    ],
    destinations: [
      {
        id: "nursing-clinical-specialist",
        title: "Clinical Nurse Specialist",
        durationMonths: 18,
        growthDirection: "deeper",
        rationale:
          "Build recognised capability and case experience in a named clinical specialism.",
        skills: [
          "Specialist assessment",
          "Care pathways",
          "Clinical education",
          "Audit",
        ],
      },
      {
        id: "nursing-ward-manager",
        title: "Ward Manager / Matron",
        durationMonths: 18,
        growthDirection: "wider",
        rationale:
          "Extend shift leadership into accountable management of people, quality, and ward performance.",
        skills: [
          "Roster management",
          "Quality governance",
          "People leadership",
          "Patient safety",
        ],
      },
      {
        id: "nursing-advanced-practitioner",
        title: "Advanced Clinical Practitioner",
        durationMonths: 24,
        growthDirection: "deeper",
        rationale:
          "Progress toward an extended clinical scope through regulated education and supervised practice.",
        skills: [
          "Advanced assessment",
          "Diagnostics",
          "Prescribing pathway",
          "Clinical decision-making",
        ],
      },
      {
        id: "nursing-clinical-educator",
        title: "Clinical Educator / Practice Development Nurse",
        durationMonths: 12,
        growthDirection: "adjacent",
        rationale:
          "Use clinical credibility to develop staff capability, standards, and safe practice.",
        skills: [
          "Clinical teaching",
          "Competency assessment",
          "Preceptorship",
          "Learning evaluation",
        ],
      },
      {
        id: "nursing-healthtech-clinical-lead",
        title: "Clinical Lead in Health-tech",
        durationMonths: 15,
        growthDirection: "adjacent",
        rationale:
          "Bring nursing workflow, safety, and patient insight into digital health product delivery.",
        skills: [
          "Clinical safety",
          "Workflow mapping",
          "Digital health",
          "Product collaboration",
        ],
      },
    ],
    milestones: [
      {
        key: "scope-expansion",
        title: "Complete one target-role clinical competency",
        description:
          "Agree a named competency with a supervisor and record the required observed practice.",
      },
      {
        key: "leadership-span",
        title: "Evidence accountable shift leadership",
        description:
          "Lead at least five shifts with documented handover, staffing, and escalation outcomes.",
      },
      {
        key: "quality-improvement",
        title: "Deliver a clinical quality-improvement cycle",
        description:
          "Take a patient-safety issue from baseline audit through intervention and re-audit.",
      },
      {
        key: "preceptorship",
        title: "Complete a formal preceptorship contribution",
        description:
          "Train for and support a student or newly qualified colleague through a documented period.",
      },
      {
        key: "registration",
        title: "Update the target registration evidence",
        description:
          "Complete the CPD, reflection, or portfolio evidence required for registration or specialist progression.",
      },
      {
        key: "clinical-digital",
        title: "Develop target-role clinical informatics evidence",
        description:
          "Complete advanced system training or contribute clinical requirements to a digital workflow improvement.",
      },
    ],
    resources: [
      "Professional regulator competency framework",
      "Local clinical leadership framework",
      "Quality-improvement project template",
    ],
  },
  {
    code: "skilled-trades-automotive",
    label: "Skilled trades and automotive",
    aliases: [
      "mechanic",
      "auto technician",
      "automotive technician",
      "master technician",
      "garage owner",
      "workshop manager",
      "electrician",
      "plumber",
      "hvac technician",
    ],
    signals: [
      "vehicle repair",
      "diagnostics",
      "workshop",
      "mot",
      "apprentice",
      "electrical installation",
      "plumbing",
      "heating",
      "ventilation",
      "fault finding",
      "job costing",
      "parts inventory",
    ],
    strengths: [
      "systematic fault diagnosis",
      "technical customer communication",
      "parts control",
      "time-boxed job costing",
      "hands-on safety discipline",
    ],
    gaps: [
      "named systems or manufacturer certification",
      "business and job-costing literacy",
      "technician supervision",
      "evolving diagnostic technology",
      "formal apprentice development",
    ],
    destinations: [
      {
        id: "trades-master-technician",
        title: "Master Technician / Specialist",
        durationMonths: 12,
        growthDirection: "deeper",
        rationale:
          "Build recognised expertise in a high-value system such as EV, advanced diagnostics, or controls.",
        skills: [
          "Advanced diagnostics",
          "Systems certification",
          "Technical documentation",
          "Safety",
        ],
      },
      {
        id: "trades-workshop-manager",
        title: "Workshop / Service Manager",
        durationMonths: 12,
        growthDirection: "wider",
        rationale:
          "Move from individual jobs to accountable control of workflow, technicians, quality, and margin.",
        skills: [
          "Workshop planning",
          "People management",
          "Quality control",
          "Commercial reporting",
        ],
      },
      {
        id: "trades-garage-owner",
        title: "Independent Garage Owner",
        durationMonths: 18,
        growthDirection: "wider",
        rationale:
          "Combine technical trust with disciplined pricing, supplier, customer, and capacity systems.",
        skills: [
          "Job costing",
          "Customer acquisition",
          "Supplier accounts",
          "Business operations",
        ],
      },
      {
        id: "trades-fleet-contractor",
        title: "Fleet Maintenance Contractor",
        durationMonths: 15,
        growthDirection: "adjacent",
        rationale:
          "Develop reliable B2B maintenance delivery and reporting for fleet clients.",
        skills: [
          "Service-level agreements",
          "Preventive maintenance",
          "Fleet reporting",
          "Contract pricing",
        ],
      },
      {
        id: "trades-technical-trainer",
        title: "Technical Trainer / Assessor",
        durationMonths: 12,
        growthDirection: "adjacent",
        rationale:
          "Turn practical expertise into structured training and competency assessment.",
        skills: [
          "Technical instruction",
          "Assessment",
          "Apprentice coaching",
          "Standards mapping",
        ],
      },
    ],
    milestones: [
      {
        key: "certification",
        title: "Complete one named systems certification",
        description:
          "Earn the manufacturer, technology, or safety credential most relevant to the target role.",
      },
      {
        key: "job-costing",
        title: "Apply true job costing to ten jobs",
        description:
          "Measure labour, parts, overhead, rework, and margin to validate pricing decisions.",
      },
      {
        key: "customer-system",
        title: "Run a measurable customer retention system",
        description:
          "Track service reminders or follow-ups and record bookings generated from them.",
      },
      {
        key: "team-scheduling",
        title: "Own team or bay scheduling for one month",
        description:
          "Plan capacity, priorities, and handoffs while recording turnaround and quality outcomes.",
      },
      {
        key: "diagnostic-technology",
        title: "Demonstrate current diagnostic technology fluency",
        description:
          "Complete platform training and document one advanced diagnosis from scan to resolution.",
      },
      {
        key: "apprentice-development",
        title: "Complete one trainee competency cycle",
        description:
          "Teach, observe, and formally sign off a defined apprentice or trainee competency.",
      },
    ],
    resources: [
      "Relevant trade certification framework",
      "Job-costing worksheet",
      "Workshop capacity planning template",
    ],
  },
  {
    code: "civil-structural-engineering",
    label: "Civil and structural engineering",
    aliases: [
      "civil engineer",
      "structural engineer",
      "site engineer",
      "design engineer",
      "project engineer",
      "graduate engineer",
      "chartered engineer",
    ],
    signals: [
      "construction",
      "infrastructure",
      "structural design",
      "geotechnical",
      "building regulations",
      "design calculations",
      "site inspection",
      "temporary works",
      "bim",
      "chartership",
      "ice",
      "istructe",
    ],
    strengths: [
      "technical and compliance rigour",
      "multi-party coordination",
      "safety-case ownership",
      "auditable documentation",
      "engineering risk management",
    ],
    gaps: [
      "professional accreditation evidence",
      "larger project responsibility",
      "commercial contribution",
      "cross-disciplinary delivery leadership",
      "technical checking authority",
    ],
    destinations: [
      {
        id: "engineering-chartered-specialist",
        title: "Chartered Engineer / Technical Specialist",
        durationMonths: 18,
        growthDirection: "deeper",
        rationale:
          "Formalise technical authority through recognised accreditation and specialist project evidence.",
        skills: [
          "Chartership competencies",
          "Technical depth",
          "Design assurance",
          "Professional review",
        ],
      },
      {
        id: "engineering-project-manager",
        title: "Infrastructure Project Manager",
        durationMonths: 15,
        growthDirection: "wider",
        rationale:
          "Expand from engineering packages into delivery leadership across cost, programme, risk, and stakeholders.",
        skills: [
          "Programme control",
          "Commercial management",
          "Risk",
          "Multidisciplinary leadership",
        ],
      },
      {
        id: "engineering-principal-associate",
        title: "Principal / Associate Engineer",
        durationMonths: 18,
        growthDirection: "wider",
        rationale:
          "Build senior technical leadership, checking authority, client trust, and team development.",
        skills: [
          "Technical leadership",
          "Design review",
          "Client management",
          "Team development",
        ],
      },
      {
        id: "engineering-independent-consultant",
        title: "Independent Consulting Engineer",
        durationMonths: 18,
        growthDirection: "adjacent",
        rationale:
          "Combine specialist credibility with scoped services, commercial terms, and professional risk controls.",
        skills: [
          "Technical proposals",
          "Fee planning",
          "Professional indemnity",
          "Business development",
        ],
      },
      {
        id: "engineering-regulatory-advisor",
        title: "Technical / Regulatory Advisor",
        durationMonths: 15,
        growthDirection: "adjacent",
        rationale:
          "Apply engineering evidence and codes knowledge to standards, policy, or infrastructure planning.",
        skills: [
          "Standards interpretation",
          "Policy analysis",
          "Consultation",
          "Technical writing",
        ],
      },
    ],
    milestones: [
      {
        key: "chartership",
        title: "Complete the next chartership evidence milestone",
        description:
          "Map current evidence to the relevant professional body and submit the next required component.",
      },
      {
        key: "project-scale",
        title: "Own a larger engineering work package",
        description:
          "Take accountable design or delivery responsibility on work materially larger or more complex than previous projects.",
      },
      {
        key: "commercial",
        title: "Contribute to a technical proposal or fee bid",
        description:
          "Help define scope, assumptions, effort, risk, and price for a real client opportunity.",
      },
      {
        key: "coordination",
        title: "Lead one multidisciplinary coordination phase",
        description:
          "Run coordination across designers, contractors, clients, and approval stakeholders through a defined phase.",
      },
      {
        key: "sign-off",
        title: "Build documented checking or sign-off evidence",
        description:
          "Act as named checker or responsible engineer on an appropriate design package.",
      },
      {
        key: "regulatory",
        title: "Contribute to a standards or policy process",
        description:
          "Prepare a technical response, committee contribution, or briefing on a relevant code or consultation.",
      },
    ],
    resources: [
      "Relevant professional body competency framework",
      "Engineering project evidence log",
      "Technical proposal template",
    ],
  },
  {
    code: "fashion-apparel-retail",
    label: "Fashion and apparel retail",
    aliases: [
      "fashion retailer",
      "boutique owner",
      "store manager",
      "fashion buyer",
      "buyer",
      "visual merchandiser",
      "fashion brand founder",
      "fashion seller",
    ],
    signals: [
      "apparel",
      "fashion",
      "boutique",
      "merchandising",
      "garment",
      "seasonal range",
      "stock turn",
      "markdown",
      "open to buy",
      "wholesale",
      "own label",
      "lookbook",
    ],
    strengths: [
      "trend and buying judgement",
      "seasonal cash-flow management",
      "visual merchandising",
      "supplier relationships",
      "social-commerce selling",
    ],
    gaps: [
      "margin and open-to-buy planning",
      "digital channel execution",
      "own-label brand development",
      "multi-site systems",
      "wholesale account management",
    ],
    destinations: [
      {
        id: "fashion-regional-manager",
        title: "Multi-store / Regional Retail Manager",
        durationMonths: 15,
        growthDirection: "wider",
        rationale:
          "Apply store performance and people leadership across multiple locations with consistent standards.",
        skills: [
          "Multi-site operations",
          "Retail KPIs",
          "Manager coaching",
          "Stock allocation",
        ],
      },
      {
        id: "fashion-head-of-buying",
        title: "Buyer / Head of Buying",
        durationMonths: 12,
        growthDirection: "deeper",
        rationale:
          "Scale product judgement through range architecture, margin planning, forecasting, and supplier strategy.",
        skills: [
          "Open-to-buy",
          "Range planning",
          "Margin management",
          "Supplier negotiation",
        ],
      },
      {
        id: "fashion-own-label-founder",
        title: "Own-label Brand Founder",
        durationMonths: 18,
        growthDirection: "adjacent",
        rationale:
          "Move from reselling products to owning a differentiated range, brand, and margin structure.",
        skills: [
          "Product development",
          "Brand strategy",
          "Manufacturing",
          "Launch planning",
        ],
      },
      {
        id: "fashion-dtc-lead",
        title: "DTC E-commerce Lead",
        durationMonths: 9,
        growthDirection: "adjacent",
        rationale:
          "Turn merchandising experience into digital acquisition, conversion, retention, and trading performance.",
        skills: [
          "E-commerce trading",
          "Conversion",
          "Lifecycle marketing",
          "Digital merchandising",
        ],
      },
      {
        id: "fashion-wholesale-manager",
        title: "Wholesale / B2B Account Manager",
        durationMonths: 12,
        growthDirection: "adjacent",
        rationale:
          "Build repeatable revenue by selling ranges and managing commercial relationships with other retailers.",
        skills: [
          "Wholesale terms",
          "Account planning",
          "Range presentation",
          "Sell-through analysis",
        ],
      },
    ],
    milestones: [
      {
        key: "open-to-buy",
        title: "Build a season open-to-buy plan",
        description:
          "Set category-level sales, intake, margin, and markdown assumptions for a real or planned season.",
      },
      {
        key: "markdown",
        title: "Improve one inventory efficiency measure",
        description:
          "Reduce markdown loss or improve sell-through against a recorded prior-period baseline.",
      },
      {
        key: "digital-channel",
        title: "Launch or materially improve a digital storefront",
        description:
          "Publish a complete product range with working merchandising, checkout, and conversion measurement.",
      },
      {
        key: "own-label",
        title: "Develop a small own-label range",
        description:
          "Take a focused capsule from customer concept through costing, sourcing, and launch plan.",
      },
      {
        key: "multi-site",
        title: "Document a portable retail operating standard",
        description:
          "Create and test a merchandising or replenishment procedure another location can follow.",
      },
      {
        key: "wholesale",
        title: "Complete one wholesale account cycle",
        description:
          "Prepare terms and a range presentation, then secure or simulate a documented B2B order.",
      },
    ],
    resources: [
      "Open-to-buy planning worksheet",
      "Retail KPI benchmark guide",
      "Supplier and wholesale terms checklist",
    ],
  },
  {
    code: "creator-economy",
    label: "Content creation and creator economy",
    aliases: [
      "content creator",
      "youtuber",
      "influencer",
      "podcaster",
      "social media creator",
      "streamer",
      "newsletter writer",
      "creator",
    ],
    signals: [
      "youtube",
      "podcast",
      "newsletter",
      "audience",
      "followers",
      "subscribers",
      "sponsorship",
      "brand partnerships",
      "content calendar",
      "watch time",
      "engagement rate",
      "monetization",
    ],
    strengths: [
      "audience building",
      "brand consistency",
      "multi-format production",
      "performance analytics",
      "direct monetisation",
    ],
    gaps: [
      "revenue diversification",
      "commercial negotiation",
      "production systems",
      "retention and conversion analytics",
      "contracts and business structure",
    ],
    destinations: [
      {
        id: "creator-media-brand",
        title: "Multi-platform Media Brand",
        durationMonths: 12,
        growthDirection: "wider",
        rationale:
          "Turn solo production into a sustainable publishing system with a team and owned audience channels.",
        skills: [
          "Editorial systems",
          "Team commissioning",
          "Audience strategy",
          "Channel portfolio",
        ],
      },
      {
        id: "creator-product",
        title: "Course / Product Creator",
        durationMonths: 9,
        growthDirection: "adjacent",
        rationale:
          "Convert trusted expertise into an owned product with direct customer revenue.",
        skills: ["Offer design", "Curriculum", "Launch strategy", "Conversion"],
      },
      {
        id: "creator-talent-manager",
        title: "Brand Partnerships / Talent Manager",
        durationMonths: 12,
        growthDirection: "adjacent",
        rationale:
          "Use creator-side experience to structure deals, campaigns, and representation for talent.",
        skills: [
          "Rate cards",
          "Contract negotiation",
          "Campaign delivery",
          "Relationship management",
        ],
      },
      {
        id: "creator-platform-partnerships",
        title: "Creator Partnerships Manager",
        durationMonths: 12,
        growthDirection: "adjacent",
        rationale:
          "Bring practical creator knowledge into platform programmes, education, and partner growth.",
        skills: [
          "Partner programmes",
          "Platform strategy",
          "Creator enablement",
          "Data storytelling",
        ],
      },
      {
        id: "creator-niche-consultant",
        title: "Niche Authority / Consultant",
        durationMonths: 9,
        growthDirection: "deeper",
        rationale:
          "Translate a focused audience and proven expertise into higher-value advisory work.",
        skills: [
          "Positioning",
          "Advisory offers",
          "Case evidence",
          "Client delivery",
        ],
      },
    ],
    milestones: [
      {
        key: "revenue-diversification",
        title: "Validate a second revenue stream",
        description:
          "Launch sponsorship, membership, product, or service revenue and track its share of monthly income.",
      },
      {
        key: "retention",
        title: "Improve one audience retention metric",
        description:
          "Choose watch time, return viewers, opens, or repeat engagement and improve it against a baseline.",
      },
      {
        key: "production-system",
        title: "Systemise one recurring production task",
        description:
          "Document and delegate editing, research, scheduling, or community work for at least four publishing cycles.",
      },
      {
        key: "rate-card",
        title: "Use a documented commercial rate card",
        description:
          "Create package terms and use them in three real or simulated brand conversations.",
      },
      {
        key: "conversion-analytics",
        title: "Measure an owned-audience conversion funnel",
        description:
          "Track a complete path such as viewer to email subscriber to customer and record the baseline conversion rate.",
      },
      {
        key: "business-basics",
        title: "Put creator business protections in place",
        description:
          "Set up the appropriate business structure and a reviewed standard commercial agreement.",
      },
    ],
    resources: [
      "Creator revenue model worksheet",
      "Content production SOP template",
      "Commercial terms checklist",
    ],
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9&+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPhrase(input: string, phrase: string) {
  const normalizedPhrase = normalize(phrase);
  return (
    normalizedPhrase.length > 0 &&
    ` ${input} `.includes(` ${normalizedPhrase} `)
  );
}

export const professionClusters = clusters;

export function classifyProfession(input: string) {
  const normalized = normalize(input);
  if (!normalized) return null;

  const ranked = clusters
    .map((cluster) => {
      const aliasScore = cluster.aliases.reduce(
        (score, alias) => score + (includesPhrase(normalized, alias) ? 5 : 0),
        0,
      );
      const signalScore = cluster.signals.reduce(
        (score, signal) => score + (includesPhrase(normalized, signal) ? 2 : 0),
        0,
      );
      const destinationScore = cluster.destinations.reduce(
        (score, destination) =>
          score + (includesPhrase(normalized, destination.title) ? 4 : 0),
        0,
      );
      return { cluster, score: aliasScore + signalScore + destinationScore };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const runnerUp = ranked[1];
  if (!best || best.score < 2) return null;

  const margin = best.score - (runnerUp?.score ?? 0);
  const confidence = Math.min(0.98, 0.45 + best.score * 0.025 + margin * 0.015);
  return {
    cluster: best.cluster,
    confidence: Number(confidence.toFixed(2)),
    score: best.score,
  };
}

export function getProfessionDirections(input: string, limit = 4) {
  const classification = classifyProfession(input);
  if (!classification) return null;

  return {
    classification,
    options: classification.cluster.destinations
      .slice(0, limit)
      .map((destination, index) => ({
        ...destination,
        matchScore: Math.max(
          1,
          Math.round(classification.confidence * 100) - index,
        ),
      })),
  };
}

export function getCareerDirectionMapping(input: string, limit = 4) {
  const professionMapping = getProfessionDirections(input, limit);
  if (professionMapping) {
    return {
      classification: {
        code: professionMapping.classification.cluster.code,
        label: professionMapping.classification.cluster.label,
        confidence: professionMapping.classification.confidence,
      },
      needsClarification: false,
      options: professionMapping.options,
    };
  }

  const options = rankCareerDirections(input).slice(0, limit);
  return {
    classification:
      options.length > 0
        ? {
            code: "technology-business",
            label: "Technology and business roles",
            confidence: 0.6,
          }
        : null,
    needsClarification: options.length === 0,
    options,
  };
}

export function findProfessionDestination(id: string) {
  for (const cluster of clusters) {
    const destination = cluster.destinations.find((item) => item.id === id);
    if (destination) return { cluster, destination };
  }
  return null;
}

export function getProfessionCluster(input: string, destinationId?: string) {
  if (destinationId) {
    const matched = findProfessionDestination(destinationId);
    if (matched) return matched.cluster;
  }
  return classifyProfession(input)?.cluster ?? null;
}

export function buildProfessionJourneyStages(
  cluster: ProfessionCluster,
  durationMonths: number,
) {
  const firstEnd = Math.max(2, Math.round(durationMonths / 3));
  const secondEnd = Math.max(
    firstEnd + 2,
    Math.round((durationMonths * 2) / 3),
  );
  const stageDefinitions = [
    {
      title: "Build target-role foundations",
      duration: `Months 1-${firstEnd}`,
      description: `Close the first evidence gaps for the ${cluster.label.toLowerCase()} pathway.`,
    },
    {
      title: "Prove capability in practice",
      duration: `Months ${firstEnd + 1}-${secondEnd}`,
      description:
        "Create work-based proof that a hiring manager or professional peer can verify.",
    },
    {
      title: "Prepare the move",
      duration: `Months ${secondEnd + 1}-${durationMonths}`,
      description:
        "Package the evidence, validate it with practitioners, and pursue realistic opportunities.",
    },
  ];

  return stageDefinitions.map((stage, index) => ({
    stageOrder: index + 1,
    ...stage,
    resources: [
      {
        name: cluster.resources[index] ?? cluster.resources[0],
        type: "free" as const,
        price: "GBP 0",
      },
      {
        name: `${cluster.label} peer or advisor review`,
        type: "paid" as const,
        price: "from GBP 30",
      },
    ],
    checklist: cluster.milestones
      .slice(index * 2, index * 2 + 2)
      .map((milestone) => ({
        key: milestone.key,
        title: milestone.title,
        completed: false,
      })),
  }));
}
