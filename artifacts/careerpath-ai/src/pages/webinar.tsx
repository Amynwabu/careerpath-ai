import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileText,
  Image,
  Lightbulb,
  MessageSquareText,
  PlayCircle,
  Presentation,
  RefreshCw,
  Sparkles,
  Target,
  Video,
} from "lucide-react";

const DEMO_STEPS = [
  {
    icon: Lightbulb,
    label: "Step 1",
    title: "Idea Generation",
    desc: "Turn your passion, expertise, skill, or a problem you want to solve into a structured business idea with a clear audience and value proposition.",
    prompt:
      "Act as a business coach for a health and wellness coaching business. Help me generate profitable business ideas based on my skills, interests, audience needs, and market opportunities. Present the output in a table with the idea, target audience, offer, pain point solved, and monetisation path.",
  },
  {
    icon: FileText,
    label: "Step 2",
    title: "Research & Outlining",
    desc: "Research the selected idea, clarify the business model, and produce a complete outline for offers, audience segments, services, and learning content.",
    prompt:
      "Using the selected health and wellness coaching idea, research the target audience, their challenges, market positioning, offer structure, and content pillars. Create a detailed business outline with services, brand promise, customer journey, and launch priorities.",
  },
  {
    icon: MessageSquareText,
    label: "Step 3",
    title: "Content Creation",
    desc: "Create one week of high-retention social media content and repurpose it across Instagram, LinkedIn, TikTok, X, Facebook, and email.",
    prompt:
      "Based on the business idea and outline, create seven viral content ideas for a health and wellness coaching business. Then select one topic and write a conversational, high-retention video script with a strong hook, storytelling, B-roll ideas, and teleprompter-ready delivery.",
  },
  {
    icon: Image,
    label: "Step 5",
    title: "Image & Video Generation for YouTube and Business Ads",
    desc: "Generate engaging flyers, ad concepts, image prompts, and short video scenarios that can support business visibility and campaign launches.",
    prompt:
      "Create an engaging advertising flyer concept for a health and wellness coaching business. Include headline, subheading, call to action, visual direction, colours, and image-generation prompt. Then write three short video-ad scenarios for YouTube and social platforms.",
  },
  {
    icon: Presentation,
    label: "Step 6",
    title: "Teaching Slide Generation with Infographics",
    desc: "Convert a topic such as wellness for healthy living into structured course content, teaching slides, infographics, and practical learning activities.",
    prompt:
      "Act as an instructional designer. Create a teaching slide outline on wellness for healthy living for a general audience. Include slide titles, key points, infographic ideas, examples, exercises, and a closing action plan.",
  },
  {
    icon: BarChart3,
    label: "Step 7",
    title: "Data Analysis, Reporting & Interactive Dashboards",
    desc: "Generate sample business data, analyse it, visualise insights, and turn the result into dashboards, reports, or decision-ready summaries.",
    prompt:
      "Generate a realistic Excel-style dataset for a health and wellness coaching business, including leads, bookings, revenue, programme type, location, conversion rate, and customer feedback. Analyse the data, identify trends, and recommend dashboard visuals.",
  },
  {
    icon: CalendarClock,
    label: "Daily Business Task",
    title: "Recurring Business Operations",
    desc: "Use AI to support daily business routines such as news monitoring, email updates, calendar reminders, meeting requests, and family activity planning.",
    prompt:
      "Create a daily business task plan for a health and wellness coach. Include morning news scan, email follow-up, calendar review, content task, client reminder, lead generation action, and end-of-day report.",
  },
];

const FOUNDATIONS = [
  {
    title: "AI Mindset",
    desc: "AI literacy begins with a reset in how people see AI: it is not a replacement for expertise, but a tool that enhances thinking, communication, documentation, design, and execution.",
  },
  {
    title: "Responsible Use of AI",
    desc: "AI should be used with accuracy checks, ethical judgement, privacy awareness, and human accountability, especially in education, business, and professional decision-making.",
  },
  {
    title: "Prompting AI Tools",
    desc: "Good prompting means giving the AI context, role, task, format, tone, length, examples, and clear instructions to iterate and refine the response.",
  },
];

const MASTERCLASS_OUTCOMES = [
  "Build a business from scratch using AI",
  "Create a brand, business proposal, and offer structure",
  "Generate website copy and launch-ready content",
  "Plan social media handles and a content workflow",
  "Use AI for visuals, teaching slides, reports, and dashboards",
  "Set up practical business routines for recurring daily tasks",
];

export default function Webinar() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
        <div className="container mx-auto px-6 h-18 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center glow-box">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">Upskillintech AI Webinar</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#agenda" className="hover:text-primary transition-colors">Agenda</a>
            <a href="#prompts" className="hover:text-primary transition-colors">Prompt Examples</a>
            <a href="#masterclass" className="hover:text-primary transition-colors">Masterclass</a>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <a href="#masterclass">Register Interest <ArrowRight className="w-4 h-4 ml-1.5" /></a>
          </Button>
        </div>
      </nav>

      <section className="pt-36 pb-20 md:pt-44 md:pb-28 px-6 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="container mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-14 items-center">
            <div className="space-y-8">
              <Badge className="bg-primary/10 text-primary border-primary/20">AI Literacy Webinar</Badge>
              <div className="space-y-5">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                  One AI tool, <span className="text-primary glow-text">many possibilities</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                  Welcome to a practical webinar designed to show how one well-used AI tool can support idea generation, research, business planning, content creation, visuals, teaching materials, data analysis, dashboards, and daily business operations.
                </p>
              </div>
              <div className="glass-panel rounded-2xl p-6 border border-white/5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  My name is <span className="text-foreground font-semibold">Amaka</span>, and I am a lecturer. From the registration responses, it is clear that a major challenge is <span className="text-primary font-semibold">AI literacy</span>. At Upskillintech, we help people understand that AI is evolving quickly and that becoming AI-literate is no longer optional for modern roles, businesses, and professional projects.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="text-base h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground glow-box">
                  <a href="#agenda">Explore the Demonstration <ArrowRight className="w-5 h-5 ml-2" /></a>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base h-14 px-8 border-white/10 hover:bg-white/5">
                  <a href="#masterclass">View Masterclass Offer</a>
                </Button>
              </div>
            </div>

            <div className="glass-panel rounded-3xl border border-white/10 p-6 lg:p-8 glow-box">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Common example used in the session</p>
                  <h2 className="text-xl font-bold">Health & Wellness Coaching Business</h2>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  "Generate a business idea from passion, expertise, or a problem to solve.",
                  "Research the audience and structure the offer clearly.",
                  "Create content, ads, teaching slides, reports, and dashboards.",
                  "Build repeatable daily business tasks with AI support.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/5 p-4">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/85 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 border-y border-white/5 bg-white/2">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FOUNDATIONS.map((item) => (
              <div key={item.title} className="glass-panel rounded-2xl p-6 border border-white/5">
                <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="agenda" className="py-24 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Practical Demonstration</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From business idea to AI-supported execution</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The webinar demonstrates how to move from a rough idea into research, planning, content, visuals, teaching resources, business intelligence, and daily operating tasks.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {DEMO_STEPS.map((step) => (
              <div key={`${step.label}-${step.title}`} className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-primary/25 transition-colors h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">{step.label}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="prompts" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="container mx-auto">
          <div className="max-w-3xl mb-12">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Prompting Framework</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Prompt examples for the health and wellness coach</h2>
            <p className="text-muted-foreground leading-relaxed">
              Instead of asking a vague question such as “generate an idea for a health business”, the webinar shows how to give AI the right role, context, action, format, tone, structure, and instruction to refine the output.
            </p>
          </div>
          <div className="space-y-5">
            {DEMO_STEPS.map((step) => (
              <div key={step.prompt} className="glass-panel rounded-2xl border border-white/5 p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                  <div className="lg:w-72 flex-shrink-0">
                    <p className="text-xs font-bold text-primary mb-2">{step.label}</p>
                    <h3 className="text-lg font-bold">{step.title}</h3>
                  </div>
                  <blockquote className="text-sm text-foreground/85 leading-relaxed border-l-2 border-primary/50 pl-5">
                    {step.prompt}
                  </blockquote>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="masterclass" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-64 bg-primary/5 blur-3xl pointer-events-none" />
        <div className="container mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-[.95fr_1.05fr] gap-10 items-center">
            <div className="space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20">Next Step</Badge>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Join the practical masterclass</h2>
              <p className="text-muted-foreground leading-relaxed">
                The webinar introduces what is possible; the masterclass goes deeper. Across the last two Saturdays in July, participants will build a business from scratch using AI, including the brand, website copy, business proposal, content structure, visual assets, and operating workflow.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-panel rounded-2xl border border-white/5 p-5">
                  <p className="text-sm text-muted-foreground">Nigeria</p>
                  <p className="text-3xl font-black text-primary">₦50,000</p>
                </div>
                <div className="glass-panel rounded-2xl border border-white/5 p-5">
                  <p className="text-sm text-muted-foreground">United Kingdom</p>
                  <p className="text-3xl font-black text-primary">£50</p>
                </div>
              </div>
              <Button asChild size="lg" className="text-base h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground glow-box">
                <a href="mailto:hello@upskillintech.com?subject=AI%20Masterclass%20Registration%20Interest">Register for a Slot <ArrowRight className="w-5 h-5 ml-2" /></a>
              </Button>
            </div>
            <div className="glass-panel rounded-3xl border border-white/10 p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">What participants will build</p>
                  <h3 className="text-xl font-bold">Business launch assets</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MASTERCLASS_OUTCOMES.map((outcome) => (
                  <div key={outcome} className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/5 p-4">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/85 leading-relaxed">{outcome}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-white/5">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>Thank you for joining the webinar. Any questions?</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Demonstration-ready</span>
            <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Built for reuse</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
