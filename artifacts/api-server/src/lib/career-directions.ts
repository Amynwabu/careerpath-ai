export interface CareerDirection {
  id: string;
  title: string;
  durationMonths: number;
  rationale: string;
  skills: string[];
  signals: string[];
}

export const careerDirections: CareerDirection[] = [
  {
    id: "data-science",
    title: "Data Scientist",
    durationMonths: 9,
    rationale:
      "Build on analytical judgement with Python, statistics, and portfolio evidence.",
    skills: ["Python", "Statistics", "SQL", "Model evaluation"],
    signals: [
      "analysis",
      "analyst",
      "data",
      "excel",
      "sql",
      "reporting",
      "statistics",
      "finance",
    ],
  },
  {
    id: "ai-product",
    title: "AI Product Manager",
    durationMonths: 12,
    rationale:
      "Combine domain knowledge, communication, and delivery experience with AI product strategy.",
    skills: [
      "Product discovery",
      "AI literacy",
      "User research",
      "Roadmapping",
    ],
    signals: [
      "product",
      "project",
      "stakeholder",
      "strategy",
      "delivery",
      "customer",
      "agile",
      "manager",
    ],
  },
  {
    id: "software",
    title: "Software Engineer",
    durationMonths: 10,
    rationale:
      "Turn technical problem solving into shipped applications and interview-ready evidence.",
    skills: ["JavaScript", "React", "APIs", "Testing"],
    signals: [
      "software",
      "developer",
      "javascript",
      "python",
      "technical",
      "web",
      "code",
      "automation",
    ],
  },
  {
    id: "ux-research",
    title: "UX Researcher",
    durationMonths: 7,
    rationale:
      "Translate customer insight, teaching, or service experience into research practice and case studies.",
    skills: ["Research planning", "Interviewing", "Synthesis", "Case studies"],
    signals: [
      "research",
      "customer",
      "teaching",
      "interview",
      "qualitative",
      "service",
      "design",
      "user",
    ],
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity Analyst",
    durationMonths: 12,
    rationale:
      "Apply process discipline and risk awareness while building practical security foundations.",
    skills: ["Networks", "Threat analysis", "Linux", "Incident response"],
    signals: [
      "security",
      "risk",
      "compliance",
      "audit",
      "network",
      "operations",
      "incident",
      "governance",
    ],
  },
  {
    id: "business-analysis",
    title: "Business Analyst",
    durationMonths: 6,
    rationale:
      "Use operational knowledge and stakeholder skills to improve processes and define change.",
    skills: [
      "Requirements",
      "Process mapping",
      "SQL",
      "Stakeholder management",
    ],
    signals: [
      "operations",
      "process",
      "business",
      "project",
      "requirements",
      "stakeholder",
      "excel",
      "reporting",
    ],
  },
];

export function rankCareerDirections(input: string) {
  const normalized = input.toLowerCase();
  return careerDirections
    .map((direction) => ({
      ...direction,
      matchScore: direction.signals.reduce(
        (score, signal) => score + (normalized.includes(signal) ? 1 : 0),
        0,
      ),
    }))
    .filter((direction) => direction.matchScore > 0)
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore || a.durationMonths - b.durationMonths,
    )
    .slice(0, 4)
    .map(({ signals: _signals, ...direction }) => direction);
}
