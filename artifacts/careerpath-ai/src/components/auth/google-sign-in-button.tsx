import { Button } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  mode: "login" | "register";
};

export function GoogleSignInButton({ mode }: GoogleSignInButtonProps) {
  const handleGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogle}
      className="h-12 w-full border-white/35 bg-black/10 font-semibold hover:bg-white/5"
    >
      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
        G
      </span>
      {mode === "login" ? "Continue with Google" : "Sign up with Google"}
    </Button>
  );
}
