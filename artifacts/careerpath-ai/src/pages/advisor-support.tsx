import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-request";

type AdvisorCase = {
  id: string; advisorUserId: number; serviceType: string; caseStatus: string;
  caseStage: string; openedAt: string; nextReviewAt: string | null; recordVersion: number;
};
type CaseList = { items: AdvisorCase[]; persistenceStatus: "persistent" };
type Versioned = { id: string; recordVersion: number };
type Action = Versioned & { title: string; status: string; assignedTo: string };
type Evidence = Versioned & { description: string; status: string };
type Review = Versioned & { reviewType: string; status: string };
type FollowUp = Versioned & { followUpType: string; calculatedStatus: string };
type Collection<T> = { items: T[]; persistenceStatus: "persistent" };

export default function AdvisorSupport() {
  const { caseId } = useParams<{ caseId?: string }>();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const cases = useQuery({
    queryKey: ["client-advisor-cases"],
    queryFn: () => apiRequest<CaseList>("/advisor-cases"),
  });
  const actions = useCaseCollection<Action>(caseId, "actions");
  const evidence = useCaseCollection<Evidence>(caseId, "evidence-requests");
  const reviews = useCaseCollection<Review>(caseId, "reviews");
  const followUps = useCaseCollection<FollowUp>(caseId, "follow-ups");

  async function transition(path: string, version: number, body?: object) {
    setNotice("");
    try {
      await apiRequest(path, {
        method: "POST",
        headers: { "If-Match": String(version) },
        body: JSON.stringify(body ?? {}),
      });
      setNotice("Your update was saved and confirmed by the server.");
      await queryClient.invalidateQueries({ queryKey: ["client-advisor-case", caseId] });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your update could not be saved.");
    }
  }

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
                <div className="flex gap-2">
                  <Button asChild variant="outline"><a href={`/career-data/advisor-support/${item.id}`}>Review case</a></Button>
                  {!["access_revoked", "closed", "cancelled"].includes(item.caseStatus) &&
                    <Button variant="destructive" onClick={() => revoke(item)}>Revoke access</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {cases.data?.items.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No advisor cases.</CardContent></Card>}
        </div>
        {caseId && <section className="grid gap-4 md:grid-cols-2" aria-label="Shared case work">
          <ClientCollection title="My actions" items={actions.data?.items} render={(item: Action) => <>
            <span>{item.title} · {item.status.replaceAll("_", " ")}</span>
            {item.assignedTo === "client" && !["completed", "verified", "cancelled"].includes(item.status) &&
              <Button size="sm" onClick={() => transition(`/advisor/actions/${item.id}/complete`, item.recordVersion, { completionInformation: "Completed by client" })}>Mark complete</Button>}
          </>} />
          <ClientCollection title="Evidence requests" items={evidence.data?.items} render={(item: Evidence) => <>
            <span>{item.description} · {item.status.replaceAll("_", " ")}</span>
            {item.status === "requested" && <Button size="sm" onClick={() => transition(`/advisor/evidence-requests/${item.id}/submit`, item.recordVersion, { submissionNote: "Submitted by client" })}>Submit evidence</Button>}
          </>} />
          <ClientCollection title="Shared reviews" items={reviews.data?.items} render={(item: Review) =>
            <span>{item.reviewType.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")}</span>} />
          <ClientCollection title="Follow-ups" items={followUps.data?.items} render={(item: FollowUp) =>
            <span>{item.followUpType.replaceAll("_", " ")} · {item.calculatedStatus.replaceAll("_", " ")}</span>} />
        </section>}
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </main>
    </AppLayout>
  );
}

function useCaseCollection<T>(caseId: string | undefined, resource: string) {
  return useQuery({
    queryKey: ["client-advisor-case", caseId, resource],
    enabled: Boolean(caseId),
    queryFn: () => apiRequest<Collection<T>>(`/advisor/cases/${caseId}/${resource}`),
  });
}

function ClientCollection<T extends { id: string }>({ title, items, render }: {
  title: string; items?: T[]; render: (item: T) => React.ReactNode;
}) {
  return <Card><CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
    <CardContent>{items?.length
      ? <ul className="space-y-2">{items.map((item) => <li className="flex items-center justify-between gap-2 rounded border p-3 text-sm" key={item.id}>{render(item)}</li>)}</ul>
      : <p className="text-sm text-muted-foreground">No shared records.</p>}</CardContent>
  </Card>;
}
