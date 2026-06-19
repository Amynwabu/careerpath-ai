import { useListAnalysisHistory } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function AnalysisHistory() {
  const { data: history, isLoading } = useListAnalysisHistory();
  const noHistory = !isLoading && (!history || history.length === 0);

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
            <p className="text-muted-foreground mt-1">Track how your readiness score has evolved over time.</p>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        )}

        {noHistory && (
          <Card className="border-border bg-card">
            <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-6">
              <div>
                <h2 className="text-2xl font-bold">No History Yet</h2>
                <p className="text-muted-foreground mt-2 max-w-md">
                  Run your first career analysis to start building a history of readiness scores and track your progression over time.
                </p>
              </div>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/analysis">Run First Analysis</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {history && history.length > 0 && (
          <div className="space-y-4">
            {history.map((item, idx) => (
              <Card key={item.id} className={`border ${idx === 0 ? "border-primary/30 bg-card" : "border-border bg-card"}`}>
                <CardContent className="pt-4 pb-4 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary">{item.readinessScore}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.targetRole}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {idx === 0 && <Badge className="bg-primary/20 text-primary border-primary/30">Latest</Badge>}
                    <Badge variant="secondary" className={
                      item.readinessScore >= 70 ? "text-green-400 bg-green-500/10" :
                      item.readinessScore >= 50 ? "text-yellow-400 bg-yellow-500/10" :
                      "text-red-400 bg-red-500/10"
                    }>
                      {item.readinessScore >= 70 ? "Strong" : item.readinessScore >= 50 ? "Developing" : "Early"}
                    </Badge>
                    {idx > 0 && history[idx-1] && (
                      <div className="flex items-center gap-1 text-sm">
                        <span className={item.readinessScore >= history[idx-1].readinessScore ? "text-green-400" : "text-red-400"}>
                          {item.readinessScore >= history[idx-1].readinessScore ? "+" : ""}{item.readinessScore - history[idx-1].readinessScore}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
