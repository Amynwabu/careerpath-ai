import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardSummaryQueryKey,
  getListMilestonesQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-request";

type Direction = {
  id: string;
  title: string;
  durationMonths: number;
  rationale: string;
  skills: string[];
  growthDirection?: "deeper" | "wider" | "adjacent";
};

type ChecklistItem = { key: string; title: string; completed: boolean };
type JourneyStage = {
  id: number;
  stageOrder: number;
  title: string;
  duration: string;
  description: string;
  resources: Array<{ name: string; type: "free" | "paid"; price?: string }>;
  checklist: ChecklistItem[];
};

type BuildJourneyResponse = {
  journey: {
    id: number;
    targetRole: string;
    durationMonths: number;
    progress: number;
  };
  stages: JourneyStage[];
};

export default function JourneyBuilder() {
  const [activeTab, setActiveTab] = useState("describe");
  const [description, setDescription] = useState("");
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedDirectionId, setSelectedDirectionId] = useState("");
  const [classification, setClassification] = useState<string | null>(null);
  const [journey, setJourney] = useState<BuildJourneyResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedDirection =
    directions.find((item) => item.id === selectedDirectionId) ?? directions[0];
  const progress = useMemo(() => {
    const items = journey?.stages.flatMap((stage) => stage.checklist) ?? [];
    if (items.length === 0) return 0;
    return Math.round(
      (items.filter((item) => item.completed).length / items.length) * 100,
    );
  }, [journey]);

  const generateDirections = async () => {
    setIsGenerating(true);
    try {
      const response = await apiRequest<{
        options: Direction[];
        classification: { label: string } | null;
        needsClarification: boolean;
      }>("/journey/generate", {
        method: "POST",
        body: JSON.stringify({ description }),
      });
      if (response.options.length === 0) {
        toast({
          title: "Add more profession detail",
          description:
            "Include your role, field, responsibilities, and the kind of progression you want.",
          variant: "destructive",
        });
        return;
      }
      setDirections(response.options);
      setSelectedDirectionId(response.options[0].id);
      setClassification(response.classification?.label ?? null);
      setActiveTab("direction");
    } catch (error) {
      toast({
        title: "Could not generate directions",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const buildJourney = async () => {
    setIsBuilding(true);
    try {
      const response = await apiRequest<BuildJourneyResponse>(
        "/journey/build",
        {
          method: "POST",
          body: JSON.stringify({ selectedDirectionId }),
        },
      );
      setJourney(response);
      setActiveTab("journey");
      await queryClient.invalidateQueries({
        queryKey: getListMilestonesQueryKey(),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      toast({
        title: "Journey created",
        description: `Your ${response.journey.targetRole} pathway is ready.`,
      });
    } catch (error) {
      toast({
        title: "Could not build the journey",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const updateMilestone = async (stageId: number, item: ChecklistItem) => {
    setUpdatingKey(item.key);
    try {
      await apiRequest(`/journey/stage/${stageId}/milestone`, {
        method: "PATCH",
        body: JSON.stringify({
          checklistItemKey: item.key,
          completed: !item.completed,
        }),
      });
      setJourney(
        (current) =>
          current && {
            ...current,
            stages: current.stages.map((stage) =>
              stage.id === stageId
                ? {
                    ...stage,
                    checklist: stage.checklist.map((entry) =>
                      entry.key === item.key
                        ? { ...entry, completed: !entry.completed }
                        : entry,
                    ),
                  }
                : stage,
            ),
          },
      );
      await queryClient.invalidateQueries({
        queryKey: getListMilestonesQueryKey(),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
    } catch (error) {
      toast({
        title: "Milestone was not updated",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  const generateCertificate = async () => {
    if (!journey) return;
    try {
      const certificate = await apiRequest<{ verifyUrl: string }>(
        "/certificates/generate",
        {
          method: "POST",
          body: JSON.stringify({ journeyId: journey.journey.id }),
        },
      );
      setLocation(certificate.verifyUrl);
    } catch (error) {
      toast({
        title: "Certificate is not available",
        description:
          error instanceof Error
            ? error.message
            : "Complete the journey first.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Career Journey
              </h1>
              <p className="text-muted-foreground mt-1">
                Turn your profile and analysis into a 6-month action plan.
              </p>
            </div>
          </div>
          {journey && (
            <Badge className="bg-primary/20 text-primary border-primary/30">
              {progress}% complete
            </Badge>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="describe">Describe</TabsTrigger>
            <TabsTrigger value="direction">Direction</TabsTrigger>
            <TabsTrigger value="journey" disabled={!journey}>
              Journey
            </TabsTrigger>
          </TabsList>

          <TabsContent value="describe">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Describe your next move</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Use a few sentences about your experience, strengths, and the
                  work you want to move toward. Your saved profile and career
                  goal are included automatically.
                </p>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-40"
                  placeholder="I work in operations and enjoy solving problems with data. I want to move into a technical role but need a practical path."
                />
                <Button onClick={generateDirections} disabled={isGenerating}>
                  {isGenerating
                    ? "Finding directions..."
                    : "Find directions"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="direction" className="space-y-5">
            {classification && (
              <p className="text-sm text-muted-foreground">
                Profession map:{" "}
                <span className="font-medium text-foreground">
                  {classification}
                </span>
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {directions.map((direction) => {
                const selected = direction.id === selectedDirectionId;
                return (
                  <button
                    key={direction.id}
                    type="button"
                    onClick={() => setSelectedDirectionId(direction.id)}
                    className={`rounded-lg border p-5 text-left transition-colors ${selected ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold text-lg">
                        {direction.title}
                      </h2>
                      {selected && <Badge>Selected</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {direction.rationale}
                    </p>
                    {direction.growthDirection && (
                      <p className="mt-3 text-xs uppercase text-muted-foreground">
                        {direction.growthDirection} progression
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {direction.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm font-medium mt-4">
                      Training plan: {direction.durationMonths} months
                    </p>
                  </button>
                );
              })}
            </div>
            <Button
              onClick={buildJourney}
              disabled={isBuilding || !selectedDirection}
            >
              {isBuilding
                ? "Building selected journey..."
                : "Build selected journey"}
            </Button>
          </TabsContent>

          <TabsContent value="journey" className="space-y-5">
            {journey && (
              <>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-5">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current pathway
                      </p>
                      <h2 className="text-xl font-semibold">
                        {journey.journey.targetRole}
                      </h2>
                    </div>
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>

                {journey.stages.map((stage) => (
                  <Card key={stage.id} className="border-border bg-card">
                    <CardHeader>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle>
                          {stage.stageOrder}. {stage.title}
                        </CardTitle>
                        <Badge variant="secondary">{stage.duration}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {stage.description}
                      </p>
                    </CardHeader>
                    <CardContent className="grid gap-5 lg:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Resources</p>
                        {stage.resources.map((resource) => (
                          <div
                            key={resource.name}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                          >
                            <span>{resource.name}</span>
                            <Badge
                              variant={
                                resource.type === "free"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {resource.price ?? resource.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Progress actions</p>
                        {stage.checklist.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => updateMilestone(stage.id, item)}
                            disabled={updatingKey === item.key}
                            className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left text-sm hover:border-primary/30"
                          >
                            <span
                              className={`min-w-14 text-xs font-semibold ${item.completed ? "text-primary" : "text-muted-foreground"}`}
                            >
                              {item.completed ? "Done" : "Mark done"}
                            </span>
                            <span
                              className={
                                item.completed
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }
                            >
                              {item.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card className="border-border bg-card">
                  <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Weekly reminders are active</p>
                      <p className="text-sm text-muted-foreground">
                        One focus task, one training tip, and one thing to skip.
                      </p>
                    </div>
                    <Button
                      onClick={generateCertificate}
                      disabled={progress !== 100}
                      variant={progress === 100 ? "default" : "outline"}
                    >
                      Generate certificate
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
