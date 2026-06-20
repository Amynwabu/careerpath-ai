import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api-request";
import { BrandMark } from "@/components/brand/brand-mark";

type Verification = {
  valid: boolean;
  title: string;
  recipientName: string;
  completionDuration: string;
  issuedAt: string;
  pdfUrl: string | null;
};

export default function VerifyCertificate() {
  const [, params] = useRoute("/verify/:token");
  const token = params?.token ?? "";
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiRequest<Verification>(`/certificates/verify/${encodeURIComponent(token)}`)
      .then(setVerification)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Certificate not found."));
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <BrandMark />
            CareerPathX
          </Link>
          <Button asChild variant="outline"><Link href="/login">Sign in</Link></Button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        {!verification && !error && <Skeleton className="h-96 w-full" />}

        {error && (
          <Card className="border-destructive/40 bg-card">
            <CardContent className="py-14 text-center">
              <h1 className="text-2xl font-bold">Certificate not verified</h1>
              <p className="text-muted-foreground mt-2">{error}</p>
            </CardContent>
          </Card>
        )}

        {verification && (
          <Card className="border-primary/30 bg-card">
            <CardContent className="p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <Badge className="bg-primary/20 text-primary border-primary/30">Verified certificate</Badge>
                  <h1 className="text-3xl font-bold mt-4">Certificate of Completion</h1>
                  <p className="text-sm text-muted-foreground mt-2 break-all">Verification token: {token}</p>
                </div>
              </div>

              <div className="mt-8 rounded-lg border border-border bg-background/40 p-6">
                <p className="text-sm uppercase text-muted-foreground">Awarded to</p>
                <p className="text-3xl font-bold mt-2">{verification.recipientName}</p>
                <div className="grid gap-5 sm:grid-cols-2 mt-8">
                  <div><p className="text-sm text-muted-foreground">Journey</p><p className="font-semibold">{verification.title}</p></div>
                  <div><p className="text-sm text-muted-foreground">Completion</p><p className="font-semibold">{verification.completionDuration}</p></div>
                  <div><p className="text-sm text-muted-foreground">Issue date</p><p className="font-semibold">{new Date(verification.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p></div>
                  <div><p className="text-sm text-muted-foreground">Status</p><p className="font-semibold text-primary">Authentic</p></div>
                </div>
              </div>

              {verification.pdfUrl && (
                <Button asChild className="mt-6"><a href={verification.pdfUrl} target="_blank" rel="noreferrer">Download PDF</a></Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
