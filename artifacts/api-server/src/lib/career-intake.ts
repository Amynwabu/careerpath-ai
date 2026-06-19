const rolePatterns = [
  "product manager",
  "project manager",
  "operations manager",
  "marketing manager",
  "customer success manager",
  "business analyst",
  "data analyst",
  "financial analyst",
  "software engineer",
  "software developer",
  "web developer",
  "ux designer",
  "graphic designer",
  "accountant",
  "administrator",
  "teacher",
  "nurse",
  "head chef",
  "executive chef",
  "restaurant manager",
  "hospitality manager",
  "mechanic",
  "automotive technician",
  "workshop manager",
  "electrician",
  "plumber",
  "civil engineer",
  "structural engineer",
  "site engineer",
  "fashion buyer",
  "boutique owner",
  "visual merchandiser",
  "content creator",
  "podcaster",
  "sales executive",
  "customer service advisor",
  "consultant",
  "researcher",
];

const skillPatterns = [
  "Agile",
  "AWS",
  "Azure",
  "Budget Management",
  "Business Analysis",
  "Communication",
  "Customer Service",
  "Data Analysis",
  "Excel",
  "Figma",
  "JavaScript",
  "Leadership",
  "Machine Learning",
  "Marketing",
  "Microsoft Office",
  "Power BI",
  "Presentation",
  "Problem Solving",
  "Product Management",
  "Project Management",
  "Python",
  "React",
  "Research",
  "Risk Management",
  "Sales",
  "SQL",
  "Stakeholder Management",
  "Tableau",
  "Team Management",
  "User Research",
  "Curriculum Design",
  "Assessment Design",
  "Clinical Risk Assessment",
  "Patient Care",
  "Quality Improvement",
  "Fault Diagnosis",
  "Job Costing",
  "Technical Documentation",
  "Visual Merchandising",
  "Inventory Planning",
  "Content Production",
  "Audience Analytics",
  "Supplier Management",
];

const industrySignals: Array<[string, string[]]> = [
  [
    "Technology",
    ["software", "technology", "developer", "cloud", "data", "digital"],
  ],
  [
    "Financial Services",
    ["bank", "finance", "financial", "insurance", "accounting"],
  ],
  ["Healthcare", ["health", "hospital", "clinical", "patient", "nurse"]],
  ["Education", ["school", "university", "education", "teacher", "student"]],
  [
    "Food and Hospitality",
    ["restaurant", "hospitality", "chef", "catering", "food service"],
  ],
  [
    "Automotive and Skilled Trades",
    ["mechanic", "automotive", "workshop", "electrician", "plumber", "hvac"],
  ],
  [
    "Construction and Infrastructure",
    ["civil engineer", "structural engineer", "construction", "infrastructure"],
  ],
  [
    "Fashion and Apparel",
    ["fashion", "apparel", "boutique", "merchandising", "garment"],
  ],
  [
    "Media and Creator Economy",
    ["content creator", "youtube", "podcast", "newsletter", "audience"],
  ],
  [
    "Retail and Consumer",
    ["retail", "store", "ecommerce", "consumer", "merchandising"],
  ],
  ["Professional Services", ["consulting", "consultant", "client", "advisory"]],
  [
    "Public Sector",
    ["government", "council", "public sector", "civil service"],
  ],
];

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function mapCareerText(rawText: string) {
  const text = rawText
    .replace(/\0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50_000);
  const normalized = text.toLowerCase();
  const role = rolePatterns.find((candidate) => normalized.includes(candidate));
  const yearsMatch = normalized.match(
    /(?:over\s+|more than\s+)?(\d{1,2})\+?\s+years?(?:\s+of)?\s+experience/,
  );
  const yearsExperience = yearsMatch
    ? Math.min(50, Number(yearsMatch[1]))
    : undefined;
  const industry = industrySignals.find(([, signals]) =>
    signals.some((signal) => normalized.includes(signal)),
  )?.[0];
  const detectedSkills = new Set(
    skillPatterns.filter((skill) => normalized.includes(skill.toLowerCase())),
  );
  if (/\bprojects?\b|\bprogramme\b|\bdelivery\b/.test(normalized))
    detectedSkills.add("Project Management");
  if (/\bstakeholders?\b|\bclient relationships?\b/.test(normalized))
    detectedSkills.add("Stakeholder Management");
  if (
    /\blead (?:a |the )?(?:team|department)|\bmanage (?:a |the )?team\b|\bpeople management\b/.test(
      normalized,
    )
  )
    detectedSkills.add("Leadership");
  if (/\bprocess(?:es)?\b|\brequirements?\b|\bworkflow\b/.test(normalized))
    detectedSkills.add("Business Analysis");
  const skills = Array.from(detectedSkills).slice(0, 15);
  const careerLevel =
    normalized.includes("director") || normalized.includes("head of")
      ? "Director"
      : normalized.includes("senior")
        ? "Senior"
        : /\bprincipal\b|\bteam lead\b|\blead (?:engineer|designer|analyst|consultant)\b/.test(
              normalized,
            )
          ? "Lead/Principal"
          : yearsExperience && yearsExperience >= 3
            ? "Mid-level"
            : "Entry-level";

  return {
    currentRole: role ? titleCase(role) : undefined,
    yearsExperience,
    industry,
    careerLevel,
    skills,
    professionalSummary: text.slice(0, 2_000),
  };
}
