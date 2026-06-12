import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/branding/logo";
import { ArrowRight, CheckCircle2, X, Zap, HelpCircle } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "£0",
    period: "forever",
    desc: "Everything you need to explore your career direction.",
    cta: "Get Started Free",
    href: "/register",
    highlight: false,
    features: [
      { text: "Basic AI career roadmap", included: true },
      { text: "Skill gap overview (top 5 gaps)", included: true },
      { text: "3 AI analysis runs", included: true },
      { text: "Core milestone tracking", included: true },
    ],
  },
  {
    name: "Premium",
    price: "£19",
    period: "per month",
    desc: "The full career execution system. Unlimited AI guidance.",
    cta: "Start Premium",
    href: "/register",
    highlight: true,
    badge: "Most Popular",
    features: [
      { text: "Full AI career roadmap", included: true },
      { text: "Complete skill gap breakdown", included: true },
      { text: "Unlimited analysis runs", included: true },
      { text: "Full milestone tracking & history", included: true },
      { text: "AI mentor coaching tips", included: true },
      { text: "Curated training recommendations", included: true },
      { text: "Portfolio project guidance", included: true },
    ],
  },
  {
    name: "Teams",
    price: "£49",
    period: "per seat / month",
    desc: "For L&D teams, bootcamps, and cohort-based programmes.",
    cta: "Contact Us",
    href: "mailto:hello@careerpathAI.com",
    highlight: false,
    badge: "Coming Soon",
    features: [
      { text: "Everything in Premium", included: true },
      { text: "Team dashboard & analytics", included: true },
      { text: "Cohort progress tracking", included: true },
      { text: "Custom role templates", included: true },
      { text: "Bulk member onboarding", included: true },
      { text: "Dedicated account manager", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "Is the free plan really free forever?",
    a: "Yes. The Free plan has no time limit. You get 3 AI analysis runs and core features to explore your career direction without paying anything.",
  },
  {
    q: "What happens when I run out of analysis runs on Free?",
    a: "You can upgrade to Premium at any time to unlock unlimited analysis runs. Your existing data and roadmap are always preserved.",
  },
  {
    q: "Can I cancel my Premium subscription?",
    a: "Yes, you can cancel anytime. You'll keep access to Premium features until the end of your billing period.",
  },
  {
    q: "How does the AI analysis work?",
    a: "Our AI reads your profile — current role, skills, experience, education — and compares it against real requirements for your target role. It then generates a personalised gap report, roadmap, and coaching tips.",
  },
  {
    q: "What if I change my career goal?",
    a: "No problem. You can update your career goal at any time and re-run the analysis to get a fresh roadmap tailored to your new target.",
  },
  {
    q: "Is there a student or academic discount?",
    a: "We're working on student pricing. Contact us at hello@careerpathAI.com and we'll see what we can do.",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/35">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="/intelligence" className="hover:text-primary transition-colors">Intelligence</Link>
            <Link href="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
            <Link href="/pricing" className="text-primary">Pricing</Link>
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
      <section className="pt-36 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="container mx-auto text-center relative z-10">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-6">Simple Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-5">Start Free. Upgrade When Ready.</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start with the essentials. Upgrade when you want unlimited guidance.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-24 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  plan.highlight
                    ? "blue-card-strong"
                    : "blue-card"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`${plan.highlight ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"} border-0 text-xs px-3 py-1`}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                {plan.highlight && (
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                )}
                <div className="relative z-10 flex flex-col flex-1">
                  <div className="mb-6">
                    <div className="text-lg font-bold mb-1">{plan.name}</div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-4xl font-black">{plan.price}</span>
                      <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{plan.desc}</p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-2.5 text-sm">
                        {f.included
                          ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          : <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />}
                        <span className={f.included ? "text-foreground/90" : "text-muted-foreground/50 line-through"}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`w-full ${
                      plan.highlight
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground glow-box shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                        : "border border-white/35 bg-transparent hover:bg-white/5 text-foreground"
                    }`}
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    <Link href={plan.href}>
                      {plan.cta} {plan.highlight && <Zap className="w-4 h-4 ml-1.5" />}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-16 px-6 bg-white/2 border-y border-white/35">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Compare Plans</h2>
            <p className="text-muted-foreground">The main differences at a glance.</p>
          </div>
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/35">
                  <th className="text-left py-4 pr-6 font-semibold text-muted-foreground">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.name} className={`py-4 px-4 text-center font-semibold ${p.highlight ? "text-primary" : "text-muted-foreground"}`}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "AI Analysis Runs", values: ["3 runs", "Unlimited", "Unlimited"] },
                  { label: "Skill Gap Detection", values: ["Top 5", "Full breakdown", "Full breakdown"] },
                  { label: "Career Roadmap", values: ["Basic", "Full phases", "Full phases"] },
                  { label: "Milestone Tracking", values: ["Core", "Full history", "Full history"] },
                  { label: "AI Coach Tips", values: [false, true, true] },
                  { label: "Curated Training", values: [false, true, true] },
                  { label: "Portfolio Projects", values: [false, true, true] },
                  { label: "Certification Paths", values: [false, true, true] },
                  { label: "Team Dashboard", values: [false, false, true] },
                  { label: "API Access", values: [false, false, true] },
                  { label: "Support", values: ["Community", "Priority email", "Dedicated manager"] },
                ].map((row, i) => (
                  <tr key={row.label} className={`border-b border-white/35 ${i % 2 === 1 ? "bg-white/2" : ""}`}>
                    <td className="py-3.5 pr-6 text-foreground/80">{row.label}</td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="py-3.5 px-4 text-center">
                        {val === true ? (
                          <CheckCircle2 className="w-4 h-4 text-primary mx-auto" />
                        ) : val === false ? (
                          <span className="text-muted-foreground/30">—</span>
                        ) : (
                          <span className={vi === 1 ? "text-primary font-medium" : "text-muted-foreground"}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">FAQ</Badge>
            <h2 className="text-3xl font-bold mb-3">Common Questions</h2>
          </div>
          <div className="space-y-4">
            {FAQ.slice(0, 4).map((item) => (
              <div key={item.q} className="blue-card rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-2">{item.q}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/35 bg-white/2 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Start Your Career Path Today</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Free to start. Your personalised roadmap is ready in minutes.</p>
          <Button asChild size="lg" className="h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_rgba(0,240,255,0.5)] glow-box">
            <Link href="/register">Create Free Account <ArrowRight className="w-5 h-5 ml-2" /></Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/35 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Logo size="sm" />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/intelligence" className="hover:text-primary transition-colors">Features</Link>
              <Link href="/pricing" className="text-primary">Pricing</Link>
              <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} CareerPath AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
