import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand/brand-mark";

const FEATURE_GROUPS = [
  {
    badge: "Profile Review",
    headline: "Know Exactly Where You Stand",
    desc: "We review your CV, work history, skills, and certifications, then map them against practical requirements for your target role.",
    features: [
      { title: "CV Analysis", desc: "Automatically extracts skills, experience, and qualifications from your profile." },
      { title: "Role Gap Mapping", desc: "Compares your profile against live requirements for your target role." },
      { title: "Readiness Score", desc: "A single percentage that shows how close you are to being job-ready." },
      { title: "Career Level Assessment", desc: "Understands where you sit in the job market today." },
    ],
  },
  {
    badge: "Roadmap Engine",
    headline: "Your Personalised Career Path",
    desc: "Not a generic template. A phase-by-phase plan built around your specific skills, your target role, and your chosen timeline.",
    features: [
      { title: "Phase-by-Phase Roadmap", desc: "Structured phases with clear focus areas and timelines." },
      { title: "Timeline Optimisation", desc: "Set your target years and the AI builds a path that fits." },
      { title: "Progress Tracking", desc: "Bite-sized actions that keep you accountable and on track." },
      { title: "Timeline View", desc: "See how a structured plan can shorten the route to your goal." },
    ],
  },
  {
    badge: "Career Coach",
    headline: "Support That Knows Your Profile",
    desc: "Get personalised, actionable advice based on your actual profile, not generic career tips.",
    features: [
      { title: "Weekly Focus Tips", desc: "Tells you exactly which skill to work on this week for maximum progress." },
      { title: "Priority Ranking", desc: "Ranks your skill gaps by impact — so you work on what matters most first." },
      { title: "Progress Insights", desc: "Tracks your profile completion and readiness score over time." },
      { title: "Goal Adaptation", desc: "Adjusts recommendations as your profile evolves." },
    ],
  },
  {
    badge: "Learning System",
    headline: "Exact Resources. No Guessing.",
    desc: "Every skill gap comes with curated learning resources, recommended projects, and certification paths — matched specifically to your needs.",
    features: [
      { title: "Course Recommendations", desc: "Curated courses from top platforms matched to each skill gap." },
      { title: "Portfolio Projects", desc: "Project ideas that prove your skills to hiring managers." },
      { title: "Certification Paths", desc: "Recommended certifications that unlock your target role." },
      { title: "Experience Guidance", desc: "Actionable steps to build real-world experience." },
    ],
  },
];

const COMPARISON = [
  { feature: "CV Skill Analysis", generic: false, us: true },
  { feature: "Personalised Gap Report", generic: false, us: true },
  { feature: "Phase-by-Phase Roadmap", generic: false, us: true },
  { feature: "Time-to-Goal Calculation", generic: false, us: true },
  { feature: "Career Coach Tips", generic: false, us: true },
  { feature: "Curated Course Links", generic: false, us: true },
  { feature: "Portfolio Project Guidance", generic: false, us: true },
  { feature: "Milestone Tracking", generic: false, us: true },
  { feature: "Generic Career Advice", generic: true, us: false },
  { feature: "One-size-fits-all Templates", generic: true, us: false },
];

export default function Intelligence() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="font-bold text-xl tracking-tight">CareerPathX</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="/intelligence" className="text-primary">Features</Link>
            <Link href="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors hidden sm:block">Sign In</Link>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Link href="/register">Start Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="container mx-auto text-center relative z-10">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-6">Career Plan</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-tight">
            Every Feature Built to Get You <span className="text-primary glow-text">There Faster</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            CareerPathX is a complete planning workspace, from where you are today to your target role, with every step mapped and prioritised.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.4)] glow-box">
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 border-white/10 hover:bg-white/5">
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature groups */}
      {FEATURE_GROUPS.map((group, gIdx) => (
        <section key={group.badge} className={`py-24 px-6 ${gIdx % 2 === 1 ? "bg-white/2 border-y border-white/5" : ""} relative overflow-hidden`}>
          {gIdx % 2 === 0 && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          )}
          <div className="container mx-auto relative z-10">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-start ${gIdx % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
              <div className={gIdx % 2 === 1 ? "lg:order-2" : ""}>
                <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">{group.badge}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-5">{group.headline}</h2>
                <p className="text-muted-foreground leading-relaxed mb-8 text-lg">{group.desc}</p>
                <Button asChild className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                  <Link href="/register">Try It Free</Link>
                </Button>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${gIdx % 2 === 1 ? "lg:order-1" : ""}`}>
                {group.features.map((f) => (
                  <div key={f.title} className="glass-panel border border-white/5 rounded-xl p-5 hover:border-primary/20 transition-all group">
                    <h4 className="font-semibold mb-2">{f.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
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
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Why CareerPathX</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">CareerPathX vs Generic Career Advice</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Most tools give you advice. We give you a system.</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 bg-white/5 border-b border-white/5 text-sm font-semibold">
                <div className="p-4">Feature</div>
                <div className="p-4 text-center text-muted-foreground">Generic Tools</div>
                <div className="p-4 text-center text-primary">CareerPathX</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 border-b border-white/5 text-sm ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                  <div className="p-4 text-foreground/80">{row.feature}</div>
                  <div className="p-4 flex items-center justify-center">
                    <span className={row.generic ? "text-muted-foreground" : "text-muted-foreground/30"}>{row.generic ? "Included" : "Not included"}</span>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <span className={row.us ? "text-primary" : "text-muted-foreground/30"}>{row.us ? "Included" : "Not included"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5 bg-white/2">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Ready to Build Your Career Path?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Start free. Get your personalised roadmap in minutes.</p>
          <Button asChild size="lg" className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(0,240,255,0.4)] glow-box">
            <Link href="/register">Start Your Career Path</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <BrandMark size="sm" />
              <span className="font-bold text-sm">CareerPathX</span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/intelligence" className="text-primary">Features</Link>
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
