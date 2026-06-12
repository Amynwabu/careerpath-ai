import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/branding/logo";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="auth-screen min-h-screen w-full flex items-center justify-center bg-background p-6">
      <Card className="blue-card w-full max-w-md">
        <CardContent className="space-y-6 p-8 text-center">
          <div className="flex justify-center">
            <Logo size="md" />
          </div>
          <div>
            <p className="eyebrow mb-3">404</p>
            <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The page you are looking for is not available.
            </p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/">Return Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
