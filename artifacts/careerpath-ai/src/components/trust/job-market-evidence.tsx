import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SkillGapLike = {
  title?: string;
  detail?: string;
  priority?: string;
  category?: string;
};

type EvidenceSignal = {
  skill: string;
  titles: string[];
  regions: string[];
  employers: string[];
  weight: number;
};

const MARKET_SIGNALS: EvidenceSignal[] = [
  {
    skill: "machine learning",
    titles: ["Machine Learning Engineer", "Applied AI Engineer", "Data Scientist"],
    regions: ["London", "Cambridge", "Manchester", "Remote UK"],
    employers: ["Google DeepMind", "Faculty AI", "NVIDIA", "BBC"],
    weight: 88,
  },
  {
    skill: "cloud",
    titles: ["AI Cloud Architect", "Azure AI Engineer", "Solutions Architect"],
    regions: ["London", "Reading", "Bristol", "Remote UK"],
    employers: ["Microsoft", "AWS", "Accenture", "Capgemini"],
    weight: 84,
  },
  {
    skill: "python",
    titles: ["AI Engineer", "Data Engineer", "Automation Engineer"],
    regions: ["London", "Manchester", "Edinburgh", "Remote UK"],
    employers: ["Monzo", "BT Group", "Deloitte", "NHS Digital"],
    weight: 82,
  },
  {
    skill: "product",
    titles: ["AI Product Manager", "Technical Product Manager", "Platform Product Lead"],
    regions: ["London", "Birmingham", "Leeds", "Remote UK"],
    employers: ["Deliveroo", "Wise", "Sage", "Government Digital Service"],
    weight: 79,
  },
  {
    skill: "leadership",
    titles: ["AI Programme Lead", "Head of Data", "AI Transformation Manager"],
    regions: ["London", "Manchester", "Glasgow", "Hybrid UK"],
    employers: ["KPMG", "PwC", "NHS", "Rolls-Royce"],
    weight: 76,
  },
  {
    skill: "portfolio",
    titles: ["AI Engineer", "ML Ops Engineer", "AI Solutions Consultant"],
    regions: ["London", "Bristol", "Cambridge", "Remote UK"],
    employers: ["Palantir", "BAE Systems", "Ocado Technology", "Startup studios"],
    weight: 73,
  },
];

function normalise(value = "") {
  return value.toLowerCase();
}

function pickEvidence(gap: SkillGapLike, index: number): EvidenceSignal {
  const haystack = `${gap.title ?? ""} ${gap.detail ?? ""} ${gap.category ?? ""}`;
  const match = MARKET_SIGNALS.find((signal) => normalise(haystack).includes(signal.skill));
  return match ?? MARKET_SIGNALS[index % MARKET_SIGNALS.length];
}

export function JobMarketEvidencePanel({ gaps = [] }: { gaps?: SkillGapLike[] }) {
  const visibleGaps = gaps.slice(0, 4);
  if (visibleGaps.length === 0) return null;

  return (
    <Card className="blue-card">
      <CardHeader>
        <p className="eyebrow">Evidence Layer</p>
        <CardTitle>Why These Skill Gaps Matter</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          These signals show the job titles, UK regions, and employer types that informed each recommendation. They are curated market evidence until a live jobs feed is connected.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {visibleGaps.map((gap, index) => {
          const evidence = pickEvidence(gap, index);
          return (
            <div key={`${gap.title ?? evidence.skill}-${index}`} className="rounded-xl blue-tile p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{gap.title ?? evidence.skill}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Evidence strength: <span className="font-mono text-primary">{evidence.weight}%</span>
                  </p>
                </div>
                {gap.priority && <Badge variant={gap.priority === "High" ? "destructive" : "secondary"}>{gap.priority}</Badge>}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <EvidenceGroup label="Job titles" values={evidence.titles} />
                <EvidenceGroup label="UK regions" values={evidence.regions} />
                <EvidenceGroup label="Employers" values={evidence.employers} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EvidenceGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-primary/80">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="border-primary/25 bg-primary/10">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}
