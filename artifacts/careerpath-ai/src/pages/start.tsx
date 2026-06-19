import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BrandMark } from "@/components/brand/brand-mark";
import { apiRequest } from "@/lib/api-request";

interface OnboardingStatus {
  destination: "/onboarding" | "/dashboard";
}

export default function Start() {
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("Reading your career profile");

  useEffect(() => {
    let active = true;
    apiRequest<OnboardingStatus>("/onboarding/status")
      .then((status) => {
        if (!active) return;
        setMessage(status.destination === "/dashboard" ? "Opening your live dashboard" : "Preparing your career intake");
        setLocation(status.destination);
      })
      .catch(() => {
        if (active) setLocation("/onboarding");
      });
    return () => { active = false; };
  }, [setLocation]);

  return (
    <main className="min-h-screen bg-background grid place-items-center px-6">
      <div className="w-full max-w-md border border-primary/20 bg-card/80 p-8 text-center shadow-[0_0_50px_rgba(0,240,255,0.08)]">
        <BrandMark size="lg" variant="outline" className="mx-auto mb-5 animate-pulse" />
        <p className="text-xs font-semibold uppercase text-primary">Career signal check</p>
        <h1 className="mt-3 text-xl font-semibold">{message}</h1>
        <div className="mt-6 h-1 overflow-hidden bg-white/5">
          <div className="h-full w-2/3 animate-pulse bg-primary" />
        </div>
      </div>
    </main>
  );
}
