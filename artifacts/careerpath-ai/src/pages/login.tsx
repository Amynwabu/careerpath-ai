import { Link } from "wouter";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BrandMark } from "@/components/brand/brand-mark";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("google");
    if (!status) return;

    const descriptions: Record<string, string> = {
      "not-configured": "Google sign-in is not configured on the API server.",
      cancelled: "Google sign-in was cancelled.",
      "invalid-state": "Google sign-in could not be verified. Please try again.",
      unverified: "Google did not return a verified email address.",
      failed: "Google sign-in failed. Please try again or use email and password.",
    };

    toast({
      title: "Google sign-in unavailable",
      description: descriptions[status] ?? "Google sign-in could not be completed.",
      variant: "destructive",
    });
  }, [toast]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          login(data.user);
          toast({
            title: "Welcome back!",
            description: "You have signed in successfully.",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Sign in failed",
            description: error?.message || "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPHBhdGggZD0iTTAgMTBoNDBNMTAgMHY0ME0wIDIwaDQwTTIwIDB2NDBNMCAzMGg0ME0zMCAwdjQwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-50" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <BrandMark size="lg" variant="outline" className="mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
          <p className="text-muted-foreground mt-2">Welcome back — sign in to your account.</p>
        </div>

        <div className="glass-panel p-8 rounded-xl">
          <GoogleSignInButton mode="login" />
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" className="bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  "Authenticating..."
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center mt-8 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary hover:underline glow-text">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
