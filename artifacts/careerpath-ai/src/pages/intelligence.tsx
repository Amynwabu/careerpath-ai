import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/branding/logo";
import {
  ArrowRight, Brain, Map, Rocket, BarChart3, BookOpen, FolderOpen,
  TrendingUp, Target, CheckCircle2, Zap, Clock, Bot, Flag, Star,
  ChevronRight, Layers, Search, GitBranch,
} from "lucide-react";

const FEATURE_GROUPS = [
  {
    badge: "Profile Intelligence",
    headline: "Know Exactly Where You Stand",
    desc: "Our AI reads your CV, work history, skills, and certifications — then maps them against real job requirements for your target role.",
    icon: Brain,
    color: "primary",
    features: [
      { icon: Search, title: "CV Analysis", desc: "Automatically extracts skills, experience, and qualifications from your profile." },
      { icon: Target, title: "Role Gap Mapping", desc: "Compares your profile against live requirements for your target role." },
      { icon: BarChart3, title: "Readiness Score", desc: "A single percentage that shows how close you are to being job-ready." },
    ],
  },
  {
    badge: "Roadmap Engine",
    headline: "Your Personalised Career Path",
    desc: "Not a generic template. A phase-by-phase plan built around your specific skills, your target role, and your chosen timeline.",
    icon: Map,
    color: "cyan-500",
    features: [
      { icon: GitBranch, title: "Phase-by-Phase Roadmap", desc: "Structured phases with clear focus areas and timelines." },
      { icon: Clock, title: "Timeline Optimisation", desc: "Set your target years and the AI builds a path that fits." },
      { icon: Flag, title: "Milestone Tracking", desc: "Bite-sized milestones that keep you accountable and on track." },
    ],
  },
  {
    badge: "AI Coach",
    headline: "A Mentor That Knows Your Profile",
    desc: "Your AI coach gives personalised, actionable advice based on your actual data — not generic career tips.",
    icon: Bot,
    color: "purple-500",
    features: [
      { icon: Bot, title: "Weekly Focus Tips", desc: "Tells you exactly which skill to work on this week for maximum progress." },
      { icon: Layers, title: "Priority Ranking", desc: "Ranks your skill gaps by impact — so you work on what matters most first." },
      { icon: TrendingUp, title: "Progress Insights", desc: "Tracks your profile completion and readiness score over time." },
    ],
  },
  {
    badge: "Learning System",
    headline: "Exact Resources. No Guessing.",
    desc: "Every skill gap comes with curated learning resources, recommended projects, and certification paths — matched specifically to your needs.",
    icon: BookOpen,
    color: "amber-500",
    features: [
      { icon: BookOpen, title: "Curated Training", desc: "Hand-picked learning paths from top platforms matched to each skill gap." },
      { icon: FolderOpen, title: "Portfolio Projects", desc: "AI-suggested projects that prove your skills to hiring managers." },
      { icon: Layers, title: "Certification Paths", desc: "Recommended certifications that unlock your target role." },
    ],
  },
];

const COMPARISON = [
  { feature: "CV Skill Analysis", generic: false, us: true },
  { feature: "Personalised Gap Report", generic: false, us: true },
  { feature: "Phase-by-Phase Roadmap", generic: false, us: true },
  { feature: "AI Coach Tips", generic: false, us: true },
  { feature: "Curated Course Links", generic: false, us: true },
  { feature: "Milestone Tracking", generic: false, us: true },
];

export default function Intelligence() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/35">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="/intelligence" className="text-primary">Intelligence</Link>
            <Link href="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:block">Sign In</Link>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Link href="/register">Start Free <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="container mx-auto text-center relative z-10">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-6">Career Intelligence Engine</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-tight">
            Every Feature Built to Get You <span className="text-primary glow-text">There Faster</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            CareerPath AI isn't just a career tool. It's a complete execution system — from where you are today to your dream role, with every step mapped, prioritised, and guided by AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.4)] glow-box">
              <Link href="/register">Get Started Free <ArrowRight className="w-5 h-5 ml-2" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 border-white/35 hover:bg-white/5">
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature groups */}
      {FEATURE_GROUPS.map((group, gIdx) => (
        <section key={group.badge} className={`py-16 px-6 ${gIdx % 2 === 1 ? "bg-white/2 border-y border-white/35" : ""} relative overflow-hidden`}>
          {gIdx % 2 === 0 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          )}
          <div className="container mx-auto relative z-10">
            <div className={`grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 items-start ${gIdx % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
              <div className={gIdx % 2 === 1 ? "lg:order-2" : ""}>
                <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">{group.badge}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-5">{group.headline}</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">{group.desc}</p>
                <Button asChild className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                  <Link href="/register">Try It Free <ChevronRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${gIdx % 2 === 1 ? "lg:order-1" : ""}`}>
                {group.features.map((f) => (
                  <div key={f.title} className="blue-card rounded-xl p-5 transition-all group hover:border-primary/55">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-2">{f.title}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Comparison table */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Why CareerPath AI</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">CareerPath AI vs Generic Career Advice</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">A quick view of what matters most.</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="blue-card rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 bg-white/5 border-b border-white/35 text-sm font-semibold">
                <div className="p-4">Feature</div>
                <div className="p-4 text-center text-muted-foreground">Generic Tools</div>
                <div className="p-4 text-center text-primary">CareerPath AI</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 border-b border-white/35 text-sm ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <div className="p-4 text-foreground/80">{row.feature}</div>
                  <div className="p-4 flex items-center justify-center">
                    {row.generic
                      ? <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      : <span className="text-muted-foreground/30 text-lg">—</span>}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {row.us
                      ? <CheckCircle2 className="w-4 h-4 text-primary" />
                      : <span className="text-muted-foreground/30 text-lg">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/35 bg-white/2">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Ready to Build Your Career Path?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Start free. Get your personalised roadmap in minutes.</p>
          <Button asChild size="lg" className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.4)] glow-box">
            <Link href="/register">Start Your Career Path <ArrowRight className="w-5 h-5 ml-2" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/35 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/intelligence" className="text-primary">Features</Link>
              <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} CareerPath AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
