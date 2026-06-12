import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForgotPassword } from "@workspace/api-client-react";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
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

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPassword() {
  const { toast } = useToast();
  const mutation = useForgotPassword();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  return (
    <div className="auth-screen min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <Logo size="md" className="mb-8" />
          <p className="eyebrow mb-3">Account Recovery</p>
          <h1 className="text-4xl font-bold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground mt-3">Enter your email and we will send a one-hour reset link.</p>
        </div>
        <div className="auth-panel p-8 rounded-xl">
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit((values) => {
                mutation.mutate(
                  { data: values },
                  {
                    onSuccess: () => toast({ title: "Check your email", description: "If an account exists, a reset link has been sent." }),
                    onError: (error: any) => toast({ title: "Could not request reset", description: error?.message ?? "Please try again.", variant: "destructive" }),
                  },
                );
              })}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground uppercase tracking-wider text-xs">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" className="bg-black/20 border-white/35 h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full h-12 bg-primary text-primary-foreground font-semibold" disabled={mutation.isPending}>
                {mutation.isPending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>
        </div>
        <p className="text-center mt-8 text-sm text-muted-foreground">
          Remembered it? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
