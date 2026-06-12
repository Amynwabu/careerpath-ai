import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const REGIONS = ["London", "Manchester", "Cambridge", "Birmingham", "Edinburgh", "Remote UK"] as const;

const ROUTES = [
  { type: "Apprenticeship", detail: "AI/data apprenticeships through employers, government-backed providers, and degree apprenticeship routes." },
  { type: "Bootcamp", detail: "Short intensive routes for Python, analytics, cloud, and product portfolio building." },
  { type: "University", detail: "Conversion MSc, part-time postgraduate certificates, and specialist AI/data science programmes." },
  { type: "Certification", detail: "Azure AI, AWS ML, Google Cloud, IBM data science, Scrum/product credentials." },
];

const EMPLOYER_TYPES = ["Startup", "Consultancy", "Enterprise", "NHS / Public sector", "Academia"] as const;

export function UkMarketPathways() {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("London");

  return (
    <Card className="blue-card">
      <CardHeader>
        <p className="eyebrow">UK Market Fit</p>
        <CardTitle>Regional Routes And Employer Pathways</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRegion(item)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${region === item ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="rounded-xl blue-tile p-4">
          <p className="font-semibold">{region} signal</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Salary and qualification expectations vary by region and employer type. Use this as a planning filter, then validate against current job adverts before applying.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">Typical AI role range: GBP 45k-95k</Badge>
            <Badge variant="outline">Hybrid common</Badge>
            <Badge variant="outline">Portfolio proof valued</Badge>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold">Routes to consider</p>
            <div className="mt-3 grid gap-3">
              {ROUTES.map((route) => (
                <div key={route.type}>
                  <p className="text-sm font-semibold text-primary">{route.type}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{route.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-semibold">Employer-type pathways</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EMPLOYER_TYPES.map((type) => <Badge key={type} variant="secondary">{type}</Badge>)}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Startup routes reward shipping speed; consultancy rewards stakeholder communication; enterprise and NHS roles often require governance, compliance, and documentation depth.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
