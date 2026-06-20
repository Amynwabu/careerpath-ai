import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand/brand-mark";

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Glow behind */}
      <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl scale-95 pointer-events-none" />
      {/* Browser chrome */}
      <div className="relative rounded-2xl border border-white/10 bg-[#0d1117] overflow-hidden shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <div className="flex-1 mx-4 h-5 rounded-md bg-white/5 text-center text-[10px] text-muted-foreground flex items-center justify-center">
            app.careerpath.ai/dashboard
          </div>
        </div>
        {/* Dashboard content */}
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground">Your Career Dashboard</div>
              <div className="text-[10px] text-muted-foreground">Everything you need to reach your goal</div>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-md bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Run Analysis
            </div>
          </div>
          {/* 4 insight cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Target Role", value: "AI Engineer" },
              { label: "Where You Are", value: "Data Analyst" },
              { label: "What's Missing", value: "Machine Learning" },
              { label: "What To Do Next", value: "Build ML project" },
            ].map((card) => (
              <div key={card.label} className="rounded-lg bg-white/5 border border-white/5 p-2.5">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{card.label}</div>
                <div className="text-[10px] font-semibold mt-0.5 text-foreground truncate">{card.value}</div>
              </div>
            ))}
          </div>
          {/* Urgency row */}
          <div className="rounded-lg bg-white/5 border border-white/5 p-3">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Time to Goal</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] text-muted-foreground">At current pace</div>
                <div className="text-base font-bold text-muted-foreground">8.2 <span className="text-[9px]">yrs</span></div>
                <div className="h-1 rounded-full bg-white/5 mt-1 overflow-hidden">
                  <div className="h-full w-3/4 bg-muted-foreground/30 rounded-full" />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-primary">With CareerPathX</div>
                <div className="text-base font-bold text-primary">2.8 <span className="text-[9px]">yrs</span></div>
                <div className="h-1 rounded-full bg-white/5 mt-1 overflow-hidden">
                  <div className="h-full w-1/3 bg-primary rounded-full shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
                </div>
              </div>
            </div>
          </div>
          {/* AI Coach */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-2 h-2 text-primary text-[7px] font-bold flex items-center justify-center">AI</div>
              </div>
              <div className="text-[9px] font-medium text-primary">AI Coach</div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-auto" />
            </div>
            <div className="text-[9px] text-foreground/80 italic leading-tight">
              "Focus on Machine Learning this week — it's your highest-priority gap for AI Engineer."
            </div>
          </div>
          {/* Skill gaps mini */}
          <div className="space-y-1.5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Priority Skill Gaps</div>
            {[
              { skill: "Machine Learning", level: "High", w: "85%" },
              { skill: "Python (Advanced)", level: "High", w: "70%" },
              { skill: "MLOps / Deployment", level: "Med", w: "55%" },
            ].map((gap) => (
              <div key={gap.skill} className="flex items-center gap-2">
                <div className="text-[9px] text-foreground flex-1 truncate">{gap.skill}</div>
                <div className={`text-[8px] px-1.5 py-0.5 rounded-full ${gap.level === "High" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{gap.level}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const TRANSFORMATIONS = [
  { from: "Business Analyst", to: "Data Scientist", time: "14 months" },
  { from: "Teacher", to: "AI Product Manager", time: "18 months" },
  { from: "Graduate", to: "Software Engineer", time: "8 months" },
  { from: "Marketing Manager", to: "Growth Engineer", time: "12 months" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Analyse",
    desc: "Upload your CV and tell us your target role. Our AI breaks down your current skills, experience, and qualifications against real job requirements.",
    bullets: ["CV skill extraction", "Role requirement mapping", "Gap identification"],
  },
  {
    step: "02",
    title: "Map",
    desc: "Get a personalised, phase-by-phase career roadmap built around your timeline — not a generic template.",
    bullets: ["Custom milestone plan", "Priority skill ordering", "Timeline optimisation"],
  },
  {
    step: "03",
    title: "Execute",
    desc: "Every gap comes with curated courses, tools, and project ideas — so you always know exactly what to do next.",
    bullets: ["Curated learning resources", "Portfolio project ideas", "Progress tracking"],
  },
];

const FEATURES = [
  { title: "Skill Gap Detection", desc: "AI compares your profile to real job requirements and highlights exactly what's missing." },
  { title: "AI Career Roadmap", desc: "Phase-by-phase plan personalised to your timeline, skills, and target role." },
  { title: "Learning Platform Links", desc: "Curated courses from Coursera, Udemy, YouTube, and more — matched to your gaps." },
  { title: "Portfolio Guidance", desc: "AI-suggested projects that prove your skills to employers." },
  { title: "Progress Tracking", desc: "Milestone-based tracking so you know exactly how far you've come." },
  { title: "Real Job Outcomes", desc: "Every recommendation is tied to actual hiring requirements, not guesswork." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
        <div className="container mx-auto px-6 h-18 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="font-bold text-xl tracking-tight">CareerPathX</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="/intelligence" className="hover:text-primary transition-colors">Intelligence</Link>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:block">
              Sign In
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Link href="/register">Start Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-36 pb-20 md:pt-44 md:pb-28 px-6 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                AI-Powered Career Transformation
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                The fastest way to go from{" "}
                <span className="text-primary glow-text">where you are</span>{" "}
                to where you want to be
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Upload your CV. Choose your future role. Get a step-by-step roadmap, skills gap analysis, and exact platforms to learn from — powered by AI.
              </p>

              {/* 3-step process */}
              <div className="space-y-3">
                {[
                  "Upload your CV",
                  "Select your dream role",
                  "Get your AI-powered roadmap",
                ].map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="text-base h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.4)] glow-box">
                  <Link href="/register">Start Your Career Path</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base h-14 px-8 border-white/10 hover:bg-white/5">
                  <Link href="/pricing">View Plans</Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">Free to start. No credit card required.</p>
            </div>

            {/* Right — dashboard mockup */}
            <div className="relative hidden lg:block">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="py-8 border-y border-white/5 bg-white/2">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div>Built by an AI & Robotics expert</div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div>Academic & industry validated</div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div>AI-powered gap analysis</div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div>Personalised milestones</div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How CareerPathX Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Three steps from where you are to where you want to be.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative group">
                <div className="glass-panel border border-white/5 rounded-2xl p-8 h-full hover:border-primary/20 transition-all duration-300">
                  <div className="text-5xl font-black text-primary/10 mb-4">{step.step}</div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">{step.desc}</p>
                  <ul className="space-y-2">
                    {step.bullets.map(b => (
                      <li key={b} className="border-l border-primary/40 pl-3 text-sm text-foreground/80">{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFFERENTIATOR ── */}
      <section className="py-24 px-6 bg-white/2 border-y border-white/5 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">The Difference</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Not Just Advice —<br />
                <span className="text-primary">A Full Career Execution System</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Most career tools tell you what's wrong. We tell you exactly how to fix it — with a step-by-step plan, curated learning resources, and AI-guided milestones that adapt to your progress.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/intelligence">Explore All Features</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="glass-panel border border-white/5 rounded-xl p-5 hover:border-primary/20 transition-all">
                  <h4 className="font-semibold text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Real Transformations</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From Where You Are To Where You Want To Be
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              CareerPathX has helped professionals make career transitions that felt impossible — with a clear, AI-generated plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRANSFORMATIONS.map((t) => (
              <div key={t.from} className="glass-panel border border-white/5 rounded-xl p-6 hover:border-primary/20 transition-all group">
                <div className="text-sm text-muted-foreground mb-1">From</div>
                <div className="font-semibold mb-3">{t.from}</div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-primary/40" />
                </div>
                <div className="text-sm text-muted-foreground mb-1">To</div>
                <div className="font-bold text-primary mb-4">{t.to}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {t.time} with AI guidance
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section className="py-24 px-6 bg-white/2 border-y border-white/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Simple Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Free. Upgrade When Ready.</h2>
            <p className="text-muted-foreground max-w-md mx-auto">No credit card required to get started. Upgrade to unlock the full career execution system.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free */}
            <div className="glass-panel border border-white/5 rounded-2xl p-8">
              <div className="text-lg font-bold mb-1">Free</div>
              <div className="text-3xl font-black mb-6">£0 <span className="text-sm font-normal text-muted-foreground">forever</span></div>
              <ul className="space-y-3 mb-8">
                {["Basic career roadmap", "Skill gap overview", "3 AI analysis runs", "Core milestone tracking"].map(f => (
                  <li key={f} className="border-l border-primary/40 pl-3 text-sm">{f}</li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full border-white/10 hover:bg-white/5">
                <Link href="/register">Get Started Free</Link>
              </Button>
            </div>

            {/* Premium */}
            <div className="relative rounded-2xl border border-primary/30 bg-primary/5 p-8 overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary text-primary-foreground border-0 text-xs">Most Popular</Badge>
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="text-lg font-bold mb-1">Premium</div>
                <div className="text-3xl font-black mb-6">£19 <span className="text-sm font-normal text-muted-foreground">/ month</span></div>
                <ul className="space-y-3 mb-8">
                  {["Full AI career roadmap", "Unlimited analysis runs", "AI mentor coaching", "Advanced course recommendations", "Portfolio project guidance", "Priority skill gap detection"].map(f => (
                    <li key={f} className="border-l border-primary/40 pl-3 text-sm">{f}</li>
                  ))}
                </ul>
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-box">
                  <Link href="/pricing">See Full Plan</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 max-w-2xl mx-auto leading-tight">
            Your Career Won't Change<br />Unless You Do
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">
            Start your AI-powered career path today. It takes less than 5 minutes to get your personalised roadmap.
          </p>
          <Button asChild size="lg" className="text-base h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_rgba(0,240,255,0.5)] glow-box">
            <Link href="/register">Start Your Career Path</Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Free to start · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BrandMark size="sm" />
              <span className="font-bold text-sm">CareerPathX</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/intelligence" className="hover:text-primary transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} CareerPathX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
