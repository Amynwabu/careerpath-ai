import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-request";

type Advisor = {
  id: number;
  name: string;
  role: string;
  rating: string;
  sessionsCompleted: number;
  specialisms: string[];
  availability: string;
  quote: string;
  bestFor: string;
  sessionPricePence: number;
};

export default function Advisors() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    apiRequest<Advisor[]>("/advisors")
      .then(setAdvisors)
      .catch((error) => toast({
        title: "Could not load advisors",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      }))
      .finally(() => setIsLoading(false));
  }, [toast]);

  const bookAdvisor = async (advisor: Advisor) => {
    setBookingId(advisor.id);
    try {
      await apiRequest("/advisor/book", {
        method: "POST",
        body: JSON.stringify({ advisorId: advisor.id, requestedSlot: advisor.availability }),
      });
      toast({
        title: "Session requested",
        description: `${advisor.name}'s availability will be confirmed with you.`,
      });
    } catch (error) {
      toast({
        title: "Booking was not created",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBookingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Career Advisors</h1>
            <p className="text-muted-foreground mt-1">Book focused human guidance when your journey needs judgement.</p>
          </div>
        </div>

        {isLoading && (
          <div className="grid gap-5 lg:grid-cols-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-96 w-full" />)}
          </div>
        )}

        {!isLoading && advisors.length === 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <h2 className="text-xl font-semibold">No advisors are currently available</h2>
              <p className="text-muted-foreground mt-2">Check again after advisor availability has been published.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {advisors.map((advisor) => (
            <Card key={advisor.id} className="border-border bg-card flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{advisor.name}</CardTitle>
                    <p className="text-sm text-primary mt-1">{advisor.role}</p>
                  </div>
                  <Badge variant="secondary">Rating {advisor.rating}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-5">
                <p className="text-sm leading-relaxed rounded-lg border border-border bg-background/40 p-4">&ldquo;{advisor.quote}&rdquo;</p>
                <div className="flex flex-wrap gap-2">
                  {advisor.specialisms.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{advisor.availability}</p>
                  <p><span className="text-foreground font-medium">Best for:</span> {advisor.bestFor}</p>
                  <p>{advisor.sessionsCompleted} sessions completed</p>
                </div>
                <Button className="mt-auto" onClick={() => bookAdvisor(advisor)} disabled={bookingId === advisor.id}>
                  {bookingId === advisor.id ? "Requesting session..." : `Request session - GBP ${(advisor.sessionPricePence / 100).toFixed(0)}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
