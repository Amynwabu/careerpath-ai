import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-request";

type AdvisorCase = {
  id: string; advisorUserId: number; serviceType: string; caseStatus: string;
  caseStage: string; openedAt: string; nextReviewAt: string | null; recordVersion: number;
};
type CaseList = { items: AdvisorCase[]; persistenceStatus: "persistent" };

export default function AdvisorSupport() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const cases = useQuery({
    queryKey: ["client-advisor-cases"],
    queryFn: () => apiRequest<CaseList>("/advisor-cases"),
  });

  async function revoke(item: AdvisorCase) {
    setNotice("");
    try {
      await apiRequest(`/advisor-cases/${item.id}/revoke-access`, {
        method: "POST",
        headers: { "If-Match": String(item.recordVersion) },
      });
      setNotice("Advisor access was revoked and confirmed by the server.");
      await queryClient.invalidateQueries({ queryKey: ["client-advisor-cases"] });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Access could not be revoked.");
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Career data</p>
          <h1 className="text-3xl font-semibold tracking-tight">Advisor support</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Review persisted advisor cases and revoke access. Private advisor notes are never returned here.
          </p>
        </header>
        {cases.isLoading && <p role="status">Loading advisor support…</p>}
        {cases.isError && <p className="text-sm text-destructive">Advisor support could not be loaded.</p>}
        <div className="grid gap-4">
          {cases.data?.items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-4 text-lg">
                  <span>{item.serviceType}</span>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-normal">{item.caseStatus}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Advisor user {item.advisorUserId} · {item.caseStage.replaceAll("_", " ")}
                </div>
                {!["access_revoked", "closed", "cancelled"].includes(item.caseStatus) &&
                  <Button variant="destructive" onClick={() => revoke(item)}>Revoke access</Button>}
              </CardContent>
            </Card>
          ))}
          {cases.data?.items.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No advisor cases.</CardContent></Card>}
        </div>
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </main>
    </AppLayout>
  );
}
