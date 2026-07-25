import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api-request";

type Versioned = { id: string; recordVersion: number };
type AdvisorCase = Versioned & {
  ownerUserId: number; serviceType: string; caseStatus: string; caseStage: string;
  priority: string; nextReviewAt: string | null;
};
type Action = Versioned & { title: string; description: string; status: string; assignedTo: string; dueAt: string|null };
type Evidence = Versioned & { evidenceType: string; description: string; status: string; reviewDecision: string|null };
type Review = Versioned & { resourceType: string; reviewType: string; status: string; advisorDecision: string|null };
type Session = Versioned & { sessionType: string; sessionStatus: string; scheduledStart: string|null };
type FollowUp = Versioned & { followUpType: string; dueAt: string; calculatedStatus: string };
type Outcome = Versioned & { outcomeType: string; verificationStatus: string; outcomeDate: string };
type Collection<T> = { items: T[]; persistenceStatus: "persistent" };
type CaseList = Collection<AdvisorCase>;
type CaseResponse = { case: AdvisorCase; persistenceStatus: "persistent" };

export default function AdvisorWorkspace() {
  const params = useParams<{ caseId?: string }>();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [followUpDue, setFollowUpDue] = useState("");
  const [outcomeType, setOutcomeType] = useState("training_started");
  const [sessionStart, setSessionStart] = useState("");

  const cases = useQuery({
    queryKey: ["advisor-cases"],
    queryFn: () => apiRequest<CaseList>("/advisor/cases"),
  });
  const queues = useQuery({
    queryKey: ["advisor-operational-queues"],
    queryFn: () => apiRequest<{ queues: Record<string, unknown[]> }>("/advisor/queues"),
  });
  const selected = useQuery({
    queryKey: ["advisor-case", params.caseId], enabled: Boolean(params.caseId),
    queryFn: () => apiRequest<CaseResponse>(`/advisor/cases/${params.caseId}`),
  });
  const actions = collectionQuery<Action>("actions", params.caseId);
  const evidence = collectionQuery<Evidence>("evidence-requests", params.caseId);
  const reviews = collectionQuery<Review>("reviews", params.caseId);
  const sessions = collectionQuery<Session>("sessions", params.caseId);
  const outcomes = collectionQuery<Outcome>("outcomes", params.caseId);
  const placements = collectionQuery<Versioned>("placements", params.caseId);
  const followUps = collectionQuery<FollowUp>("follow-ups", params.caseId);

  async function execute(operation: () => Promise<unknown>, success: string) {
    setNotice("");
    try {
      await operation();
      setNotice(success);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["advisor-cases"] }),
        queryClient.invalidateQueries({ queryKey: ["advisor-case", params.caseId] }),
        queryClient.invalidateQueries({ queryKey: ["advisor-case-operations", params.caseId] }),
        queryClient.invalidateQueries({ queryKey: ["advisor-operational-queues"] }),
      ]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The server rejected this operation.");
    }
  }

  async function transitionCase(action: "accept"|"hold"|"resume"|"close") {
    const item = selected.data?.case;
    if (!item) return;
    await execute(() => apiRequest(`/advisor/cases/${item.id}/${action}`, {
      method: "POST", headers: { "If-Match": String(item.recordVersion) },
    }), `Case ${action} was confirmed by the server.`);
  }

  async function createActionRecord(event: FormEvent) {
    event.preventDefault();
    if (!params.caseId) return;
    await execute(() => apiRequest(`/advisor/cases/${params.caseId}/actions`, {
      method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        assignedTo: "client", actionType: "agreed_action", title: actionTitle,
        description: actionTitle, priority: "standard", completionEvidenceRequired: false,
      }),
    }), "Action creation was confirmed by the server.");
    setActionTitle("");
  }

  async function createEvidence(event: FormEvent) {
    event.preventDefault();
    if (!params.caseId) return;
    await execute(() => apiRequest(`/advisor/cases/${params.caseId}/evidence-requests`, {
      method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ evidenceType: "supporting_document", description: evidenceDescription }),
    }), "Evidence request creation was confirmed by the server.");
    setEvidenceDescription("");
  }

  async function createFollowUpRecord(event: FormEvent) {
    event.preventDefault();
    if (!params.caseId) return;
    await execute(() => apiRequest(`/advisor/cases/${params.caseId}/follow-ups`, {
      method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ followUpType: "progress_review", dueAt: new Date(followUpDue).toISOString() }),
    }), "Follow-up creation was confirmed by the server.");
    setFollowUpDue("");
  }

  async function createOutcomeRecord(event: FormEvent) {
    event.preventDefault();
    if (!params.caseId) return;
    await execute(() => apiRequest(`/advisor/cases/${params.caseId}/outcomes`, {
      method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        outcomeType, outcomeDate: new Date().toISOString(),
        verificationStatus: "advisor_reviewed",
      }),
    }), "Outcome recording was confirmed by the server.");
  }

  async function createSessionRecord(event: FormEvent) {
    event.preventDefault();
    if (!params.caseId) return;
    await execute(() => apiRequest(`/advisor/cases/${params.caseId}/sessions`, {
      method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        sessionType: "advisory_review", deliveryMode: "remote",
        scheduledStart: new Date(sessionStart).toISOString(),
      }),
    }), "Session scheduling was confirmed by the server.");
    setSessionStart("");
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Advisor workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Scoped client cases</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Every list and operation is resolved from your verified profile, current grant, assignment, and scopes.
          </p>
        </header>

        <section aria-labelledby="queue-heading">
          <h2 id="queue-heading" className="mb-3 text-xl font-semibold">Operational queue</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(queues.data?.queues ?? {}).map(([name, items]) => (
              <Card key={name}><CardContent className="pt-5">
                <p className="text-2xl font-semibold">{items.length}</p>
                <p className="text-xs text-muted-foreground">{humanize(name)}</p>
              </CardContent></Card>
            ))}
          </div>
        </section>

        {cases.isLoading && <p role="status">Loading your persisted caseload…</p>}
        {cases.isError && <ErrorCard>Advisor authorization is inactive, or the caseload could not be loaded.</ErrorCard>}

        <div className="grid gap-6 lg:grid-cols-[minmax(16rem,.7fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader><CardTitle>Caseload</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {cases.data?.items.length === 0 && <p className="text-sm text-muted-foreground">No accessible cases.</p>}
              {cases.data?.items.map((item) => (
                <a key={item.id} href={`/advisor/cases/${item.id}`}
                  className="block rounded-lg border p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{item.serviceType}</span>
                    <State value={item.caseStatus} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{humanize(item.caseStage)} · {item.priority}</p>
                </a>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>{params.caseId ? "Case overview" : "Select a case"}</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {selected.isError && <p className="text-sm text-destructive">The case was not found or access is no longer active.</p>}
                {selected.data?.case && <>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <Field label="Status" value={selected.data.case.caseStatus} />
                    <Field label="Stage" value={selected.data.case.caseStage} />
                    <Field label="Service" value={selected.data.case.serviceType} />
                    <Field label="Priority" value={selected.data.case.priority} />
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {selected.data.case.caseStatus === "pending_acceptance" && <Button onClick={() => transitionCase("accept")}>Accept case</Button>}
                    {selected.data.case.caseStatus === "active" && <Button variant="outline" onClick={() => transitionCase("hold")}>Put on hold</Button>}
                    {selected.data.case.caseStatus === "on_hold" && <Button onClick={() => transitionCase("resume")}>Resume</Button>}
                    {["active","on_hold","awaiting_client","awaiting_advisor"].includes(selected.data.case.caseStatus) &&
                      <Button variant="outline" onClick={() => transitionCase("close")}>Close case</Button>}
                  </div>
                </>}
                {notice && <p role="status" aria-live="polite" className="rounded-md border p-3 text-sm">{notice}</p>}
              </CardContent>
            </Card>

            {params.caseId && <>
              <WorkflowCard title="Actions" count={actions.data?.items.length}>
                <form onSubmit={createActionRecord} className="flex gap-2">
                  <label className="sr-only" htmlFor="action-title">Action title</label>
                  <Input id="action-title" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} placeholder="Agreed client action" required />
                  <Button type="submit">Add action</Button>
                </form>
                <RecordList items={actions.data?.items} render={(item) => <>
                  <span>{item.title}</span><State value={item.status} />
                  {item.status === "completed" && <Button size="sm" onClick={() => execute(
                    () => apiRequest(`/advisor/actions/${item.id}/verify`, { method:"POST", headers:{"If-Match":String(item.recordVersion)} }),
                    "Action verification was confirmed by the server.",
                  )}>Verify</Button>}
                </>} />
              </WorkflowCard>

              <WorkflowCard title="Evidence requests" count={evidence.data?.items.length}>
                <form onSubmit={createEvidence} className="flex gap-2">
                  <label className="sr-only" htmlFor="evidence-description">Evidence request</label>
                  <Input id="evidence-description" value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="Evidence required" required />
                  <Button type="submit">Request</Button>
                </form>
                <RecordList items={evidence.data?.items} render={(item) => <><span>{item.description}</span><State value={item.status} /></>} />
              </WorkflowCard>

              <WorkflowCard title="Reviews" count={reviews.data?.items.length}>
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  CV and interview review disabled: Persistent source record required before advisor review can begin.
                </p>
                <RecordList items={reviews.data?.items} render={(item) => <><span>{humanize(item.reviewType)}</span><State value={item.status} /></>} />
              </WorkflowCard>

              <WorkflowCard title="Sessions and shared summaries" count={sessions.data?.items.length}>
                <form onSubmit={createSessionRecord} className="flex gap-2">
                  <label className="sr-only" htmlFor="session-start">Session start</label>
                  <Input id="session-start" type="datetime-local" value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} required />
                  <Button type="submit">Schedule</Button>
                </form>
                <RecordList items={sessions.data?.items} render={(item) => <><span>{humanize(item.sessionType)}</span><State value={item.sessionStatus} /></>} />
              </WorkflowCard>

              <WorkflowCard title="Outcomes and placements" count={(outcomes.data?.items.length ?? 0) + (placements.data?.items.length ?? 0)}>
                <form onSubmit={createOutcomeRecord} className="flex gap-2">
                  <label className="sr-only" htmlFor="outcome-type">Outcome type</label>
                  <select id="outcome-type" className="h-10 rounded-md border bg-background px-3" value={outcomeType} onChange={(e) => setOutcomeType(e.target.value)}>
                    <option value="training_started">Training started</option>
                    <option value="application_submitted">Application submitted</option>
                    <option value="interview_secured">Interview secured</option>
                    <option value="job_offer_received">Job offer received</option>
                    <option value="job_started">Job started</option>
                  </select>
                  <Button type="submit">Record outcome</Button>
                </form>
                <RecordList items={outcomes.data?.items} render={(item) => <><span>{humanize(item.outcomeType)}</span><State value={item.verificationStatus} /></>} />
              </WorkflowCard>

              <WorkflowCard title="Follow-ups" count={followUps.data?.items.length}>
                <form onSubmit={createFollowUpRecord} className="flex gap-2">
                  <label className="sr-only" htmlFor="follow-up-due">Follow-up due</label>
                  <Input id="follow-up-due" type="datetime-local" value={followUpDue} onChange={(e) => setFollowUpDue(e.target.value)} required />
                  <Button type="submit">Add follow-up</Button>
                </form>
                <RecordList items={followUps.data?.items} render={(item) => <>
                  <span>{humanize(item.followUpType)}</span><State value={item.calculatedStatus} />
                  {!["completed","cancelled"].includes(item.calculatedStatus) && <Button size="sm" variant="outline" onClick={() => execute(
                    () => apiRequest(`/advisor/follow-ups/${item.id}/complete`, { method:"POST", headers:{"If-Match":String(item.recordVersion)} }),
                    "Follow-up completion was confirmed by the server.",
                  )}>Complete</Button>}
                </>} />
              </WorkflowCard>
            </>}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

function collectionQuery<T>(resource: string, caseId?: string) {
  return useQuery({
    queryKey: ["advisor-case-operations", caseId, resource], enabled: Boolean(caseId),
    queryFn: () => apiRequest<Collection<T>>(`/advisor/cases/${caseId}/${resource}`),
  });
}
function WorkflowCard({ title, count, children }: { title:string; count?:number; children:React.ReactNode }) {
  return <Card><CardHeader><CardTitle className="flex justify-between">{title}<span className="text-sm font-normal">{count ?? 0}</span></CardTitle></CardHeader><CardContent className="space-y-4">{children}</CardContent></Card>;
}
function RecordList<T extends {id:string}>({ items, render }: {items?:T[];render:(item:T)=>React.ReactNode}) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">No records.</p>;
  return <ul className="space-y-2">{items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">{render(item)}</li>)}</ul>;
}
function ErrorCard({ children }: {children:React.ReactNode}) {
  return <Card><CardContent className="pt-6 text-sm text-destructive">{children}</CardContent></Card>;
}
function State({ value }: {value:string}) {
  return <span className="rounded-full bg-muted px-2 py-1 text-xs" aria-label={`Status: ${humanize(value)}`}>{humanize(value)}</span>;
}
function Field({ label, value }: {label:string;value:string}) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{humanize(value)}</dd></div>;
}
function humanize(value:string) { return value.replaceAll("_"," ").replace(/([a-z])([A-Z])/g,"$1 $2"); }
