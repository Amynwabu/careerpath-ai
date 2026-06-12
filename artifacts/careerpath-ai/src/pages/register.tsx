import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/branding/logo";
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

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function Register() {
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(
      { data: values },
      {
        onSuccess: async () => {
          await login();
          toast({
            title: "Account created",
            description: "Welcome to CareerPath AI.",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Registration failed",
            description: error?.message || "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="auth-screen min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <Logo size="md" className="mb-8" />
          <p className="eyebrow mb-3">New Workspace</p>
          <h1 className="text-4xl font-bold tracking-tight">Create account</h1>
          <p className="text-muted-foreground mt-3">Create your profile and roadmap.</p>
        </div>

        <div className="auth-panel blue-card p-8 rounded-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="bg-black/20 border-white/35 focus:border-primary/50 focus:ring-primary/20 h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" className="bg-black/20 border-white/35 focus:border-primary/50 focus:ring-primary/20 h-12" {...field} />
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
                      <Input type="password" placeholder="Create a secure password" className="bg-black/20 border-white/35 focus:border-primary/50 focus:ring-primary/20 h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-wide"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center mt-8 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
