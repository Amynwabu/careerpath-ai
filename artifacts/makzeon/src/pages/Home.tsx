import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Settings,
  Brain,
  BarChart3,
  Award,
  Zap,
  Building2,
  Factory,
  Landmark,
  ChevronRight,
  Shield,
  ShieldCheck,
  Radar,
  Activity,
  AlertTriangle,
  FileText,
  FileSearch,
  Clock3,
  Gauge,
  ClipboardCheck,
  Satellite,
} from "lucide-react";
import { capabilities, projects, industries } from "@/lib/data";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Settings,
  Brain,
  BarChart3,
  Award,
  Zap,
  Building2,
  Factory,
  Landmark,
  Shield,
  Clock3,
  Activity,
  AlertTriangle,
  FileText,
};

const heroMetrics = [
  { value: "2–4", label: "Week diagnostic", detail: "rapid health check" },
  { value: "£2B+", label: "Programme exposure", detail: "capital delivery context" },
  { value: "24/7", label: "Control visibility", detail: "dashboards and signals" },
  { value: "6", label: "Integrated disciplines", detail: "PMO to contracts" },
];

const tickerItems = [
  { label: "PMO-as-a-Service", icon: ShieldCheck },
  { label: "Project Controls", icon: Gauge },
  { label: "Planning & Scheduling", icon: Clock3 },
  { label: "Risk & Assurance", icon: Radar },
  { label: "Reporting & Analytics", icon: Activity },
  { label: "Contract Management", icon: FileSearch },
  { label: "Controls360", icon: Satellite },
  { label: "Delivery Diagnostic", icon: ClipboardCheck },
];

const aiCapabilities = [
  "AI-assisted dashboards that turn delivery data into decision-ready insight",
  "Predictive risk indicators that flag slippage before issues harden",
  "Automated reporting packs that reduce manual PMO effort and inconsistency",
  "Schedule early-warning signals across milestones, dependencies, and float",
  "Contract signal detection for obligations, change, claims, and performance risk",
];

const industryStats = [
  { stat: "79%", label: "cost overrun", source: "McKinsey" },
  { stat: "52%", label: "schedule delay", source: "McKinsey" },
  { stat: "92%", label: "miss commitments", source: "Accenture" },
  { stat: "50%", label: "PMOs close in 3 years", source: "APM" },
];

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ServiceTicker() {
  const repeated = [...tickerItems, ...tickerItems];
  return (
    <section className="overflow-hidden border-y border-[#0ea5e9]/20 bg-[#050d1a]">
      <div className="ticker-track flex w-max gap-4 py-4">
        {repeated.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={`${item.label}-${index}`}
              className="font-command mx-2 inline-flex items-center gap-2 border border-[#0ea5e9]/20 bg-[#071426] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300"
            >
              <Icon size={14} className="text-[#0ea5e9]" />
              {item.label}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AIAdvantage() {
  return (
    <section className="relative overflow-hidden border-b border-[#0ea5e9]/15 bg-[#071426]">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <FadeUp>
          <div className="command-panel grid gap-8 p-6 md:p-8 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
            <div>
              <div className="font-command mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#0ea5e9]">AI Advantage</div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                Intelligence embedded into delivery control.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                MakZeon combines project delivery discipline with AI-enabled signal detection, giving sponsors earlier visibility of risk, performance drift, reporting gaps, and contract exposure.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {aiCapabilities.map((capability, index) => (
                <div key={capability} className="flex items-start gap-3 border border-[#0ea5e9]/15 bg-[#050d1a]/70 p-4">
                  <span className="font-command text-xs font-bold text-[#0ea5e9]">0{index + 1}</span>
                  <p className="text-sm leading-relaxed text-slate-300">{capability}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function IndustryStatsBar() {
  return (
    <section className="relative overflow-hidden border-y border-[#0ea5e9]/20 bg-[#050d1a]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0ea5e9]/10 via-transparent to-[#0ea5e9]/10" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <FadeUp>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="font-command text-xs font-semibold uppercase tracking-[0.24em] text-[#0ea5e9]">Delivery risk is measurable</div>
              <h2 className="mt-2 text-2xl font-extrabold text-white">The cost of weak controls shows up fast.</h2>
            </div>
            <p className="max-w-lg text-sm text-slate-500">Source indicators: McKinsey, Accenture, and APM. Use them as a prompt to test whether your programme has reliable control signals.</p>
          </div>
          <div className="grid gap-px bg-[#0ea5e9]/20 sm:grid-cols-2 lg:grid-cols-4">
            {industryStats.map((item) => (
              <div key={item.label} className="bg-[#071426] p-6">
                <div className="font-command text-4xl font-bold text-[#38bdf8]">{item.stat}</div>
                <div className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-white">{item.label}</div>
                <div className="mt-1 text-xs text-slate-500">{item.source}</div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

export default function Home() {
  const selectedProjects = projects.slice(0, 3);

  return (
    <div className="bg-[#050d1a]">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-[#050d1a]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: "url('https://d2xsxph8kpxj0f.cloudfront.net/93064684/35MjLzcC2BmoEYM5pz8t7z/makzeon-hero-bg-LxgBC7SBpE9CScakGLu5Nf.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050d1a] via-[#050d1a]/90 to-[#050d1a]/55" />
        <div className="absolute inset-0 hero-grid-bg" />
        <div className="scanline" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent" />
        <div className="absolute right-8 top-28 hidden h-24 w-24 border border-[#0ea5e9]/20 lg:block" />
        <div className="absolute right-24 bottom-32 hidden h-44 w-44 border border-[#0ea5e9]/10 lg:block" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 pt-40">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
            className="max-w-5xl"
          >
            <div className="font-command inline-flex items-center gap-3 mb-6 border border-[#0ea5e9]/30 bg-[#0ea5e9]/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#0ea5e9]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0ea5e9] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0ea5e9]" />
              </span>
              Live delivery command centre
            </div>

            <h1 className="max-w-4xl text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white leading-[0.98] tracking-[-0.04em] mb-6">
              Controlled Delivery. <span className="text-gradient">Confident Outcomes.</span>
            </h1>

            <p className="text-slate-300 text-lg max-w-2xl mb-10 leading-relaxed">
              MakZeon helps energy, utility, and infrastructure organisations strengthen governance, improve controls, manage risk, and deliver complex capital projects without the cost of a permanent PMO function.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                data-track="book-diagnostic"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0ea5e9] text-[#050d1a] font-bold text-sm uppercase tracking-wide hover:bg-[#38bdf8] transition-all duration-200 blue-glow group"
              >
                Book Diagnostic
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-[#0ea5e9]/30 text-slate-200 font-semibold text-sm uppercase tracking-wide hover:border-[#0ea5e9] hover:text-[#0ea5e9] transition-all duration-200"
              >
                View All Services
              </Link>
            </div>

            <div className="mt-14 grid gap-px bg-[#0ea5e9]/20 sm:grid-cols-2 lg:grid-cols-4">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="bg-[#071426]/90 p-5 backdrop-blur-sm">
                  <div className="font-command text-2xl font-bold text-[#38bdf8]">{metric.value}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{metric.label}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{metric.detail}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <ServiceTicker />
      <AIAdvantage />

      {/* Capability Strip */}
      <section className="border-y border-[#0ea5e9]/15 bg-[#071426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-[#0ea5e9]/10">
            {capabilities.slice(0, 4).map((cap, i) => {
              const Icon = iconMap[cap.icon];
              return (
                <FadeUp key={cap.title} delay={i * 0.1}>
                  <div className="lg:px-8 flex items-start gap-3">
                    {Icon && <Icon size={20} className="text-[#0ea5e9] mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-white text-sm font-semibold mb-1">{cap.title}</p>
                      <p className="text-slate-500 text-xs leading-relaxed hidden lg:block">{cap.description.split(".")[0]}.</p>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeUp>
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-16 h-16 border border-[#0ea5e9]/20" />
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/93064684/35MjLzcC2BmoEYM5pz8t7z/makzeon-about-visual-FwxmYpUsp5mzrtaFdxbSXN.webp"
                  alt="MakZeon delivery command centre"
                  className="w-full h-[420px] object-cover opacity-90"
                />
                <div className="absolute -bottom-4 -right-4 w-16 h-16 border border-[#0ea5e9]/20" />
                <div className="absolute bottom-6 left-6 command-panel px-5 py-4">
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="font-command text-[#0ea5e9] text-2xl font-bold">£2B+</p>
                      <p className="text-slate-400 text-xs">Programmes</p>
                    </div>
                    <div className="w-px bg-[#0ea5e9]/20" />
                    <div className="text-center">
                      <p className="font-command text-[#0ea5e9] text-2xl font-bold">10+</p>
                      <p className="text-slate-400 text-xs">Years</p>
                    </div>
                    <div className="w-px bg-[#0ea5e9]/20" />
                    <div className="text-center">
                      <p className="font-command text-[#0ea5e9] text-2xl font-bold">6</p>
                      <p className="text-slate-400 text-xs">Sectors</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div>
                <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Who We Are</div>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-6 leading-tight">
                  Specialist. Scalable. Sector-focused.
                </h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  MakZeon is a specialist project management and consulting firm supporting energy, utilities, and infrastructure organisations. We improve project performance, strengthen governance, manage risk, and bring delivery discipline to complex capital programmes.
                </p>
                <p className="text-slate-400 leading-relaxed mb-8">
                  Our flexible PMO-as-a-Service model gives clients access to the capability, structure, and delivery discipline of a high-performing PMO — without the cost and delay of establishing a permanent function.
                </p>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 text-[#0ea5e9] text-sm font-semibold hover:gap-3 transition-all"
                >
                  Learn More <ArrowRight size={16} />
                </Link>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-24 bg-[#071426] grid-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-16">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">What We Do</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white">Integrated project delivery capability</h2>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#0ea5e9]/10">
            {capabilities.slice(0, 4).map((cap, i) => {
              const Icon = iconMap[cap.icon];
              return (
                <FadeUp key={cap.title} delay={i * 0.1}>
                  <div className="bg-[#050d1a] p-8 card-hover h-full">
                    <div className="w-12 h-12 border border-[#0ea5e9]/30 flex items-center justify-center mb-5 bg-[#0ea5e9]/5">
                      {Icon && <Icon size={22} className="text-[#0ea5e9]" />}
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-3">{cap.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{cap.description}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <IndustryStatsBar />

      {/* Selected Experience */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Case Studies</div>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-white">Selected Experience</h2>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 text-[#0ea5e9] text-sm font-semibold hover:gap-3 transition-all shrink-0"
              >
                View All Projects <ArrowRight size={16} />
              </Link>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedProjects.map((project, i) => (
              <FadeUp key={project.id} delay={i * 0.1}>
                <div className="group bg-[#071426] border border-[#0ea5e9]/10 overflow-hidden card-hover h-full flex flex-col">
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="font-command text-[10px] font-semibold uppercase tracking-[0.15em] text-[#0ea5e9] bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 px-2.5 py-1">
                        {project.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-white font-semibold text-base mb-2 leading-tight">{project.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed flex-1">{project.description}</p>
                    <Link
                      href="/projects"
                      className="inline-flex items-center gap-1.5 text-[#0ea5e9] text-xs font-semibold mt-4 hover:gap-2.5 transition-all"
                    >
                      View Case Study <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-24 bg-[#071426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-16">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Sector Focus</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white">Industries We Serve</h2>
              <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm">
                Specialist capability across energy, utilities, infrastructure, and industrial sectors where control discipline and intelligent delivery matter most.
              </p>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((ind, i) => {
              const Icon = iconMap[ind.icon];
              return (
                <FadeUp key={ind.title} delay={i * 0.1}>
                  <div className="border border-[#0ea5e9]/15 p-7 card-hover bg-[#050d1a]/50">
                    <div className="w-10 h-10 border border-[#0ea5e9]/30 flex items-center justify-center mb-4">
                      {Icon && <Icon size={18} className="text-[#0ea5e9]" />}
                    </div>
                    <h3 className="text-white font-semibold mb-2">{ind.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{ind.description}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('https://d2xsxph8kpxj0f.cloudfront.net/93064684/35MjLzcC2BmoEYM5pz8t7z/makzeon-pmo-visual-dGVzatwymxrJG3AssTujbS.webp')" }}
        />
        <div className="absolute inset-0 bg-[#050d1a]/90" />
        <div className="absolute inset-0 hero-grid-bg opacity-50" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="max-w-3xl">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-4">Start with a Delivery Diagnostic</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
                See the true project position before risk becomes recovery.
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Our Delivery Diagnostic gives sponsors and programme directors an independent view of project health, governance gaps, risk exposure, and recovery priorities in two to four weeks.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/contact"
                  data-track="book-diagnostic"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0ea5e9] text-[#050d1a] font-bold text-sm uppercase tracking-wide hover:bg-[#38bdf8] transition-all blue-glow"
                >
                  Book Diagnostic <ArrowRight size={16} />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 px-7 py-3.5 border border-[#0ea5e9]/30 text-slate-200 font-semibold text-sm uppercase tracking-wide hover:border-[#0ea5e9] hover:text-[#0ea5e9] transition-all"
                >
                  View All Services
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
