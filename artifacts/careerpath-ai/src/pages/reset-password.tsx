import { useLocation } from "wouter";
import { useState } from "react";
import { useResetPassword } from "@workspace/api-client-react";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const mutation = useResetPassword();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");

  return (
    <div className="auth-screen min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <Logo size="md" className="mb-8" />
          <p className="eyebrow mb-3">Secure Reset</p>
          <h1 className="text-4xl font-bold tracking-tight">Set new password</h1>
          <p className="text-muted-foreground mt-3">Use a strong password of at least 8 characters.</p>
        </div>
        <div className="auth-panel p-8 rounded-xl space-y-6">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="bg-black/20 border-white/35 h-12"
          />
          <Button
            className="w-full h-12 bg-primary text-primary-foreground font-semibold"
            disabled={mutation.isPending || password.length < 8 || !token}
            onClick={() => {
              mutation.mutate(
                { data: { token, password } },
                {
                  onSuccess: () => {
                    toast({ title: "Password reset", description: "You can now sign in with your new password." });
                    setLocation("/login");
                  },
                  onError: (error: any) => toast({ title: "Reset failed", description: error?.message ?? "The reset link may have expired.", variant: "destructive" }),
                },
              );
            }}
          >
            {mutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
          {!token && <p className="text-sm text-destructive">This reset link is missing a token.</p>}
        </div>
      </div>
    </div>
  );
}
