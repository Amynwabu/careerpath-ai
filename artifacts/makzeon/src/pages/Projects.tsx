import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ChevronRight, Target, BarChart3 } from "lucide-react";
import { projects } from "@/lib/data";

const categories = ["All Projects", ...Array.from(new Set(projects.map((project) => project.category)))];

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Projects() {
  const [activeCategory, setActiveCategory] = useState("All Projects");

  const filtered = activeCategory === "All Projects" ? projects : projects.filter((project) => project.category === activeCategory);

  return (
    <div className="bg-[#050d1a]">
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1800&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050d1a]/98 via-[#050d1a]/88 to-[#050d1a]/50" />
        <div className="absolute inset-0 hero-grid-bg" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-4xl">
            <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-4">Case Studies</div>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-white mb-6 tracking-[-0.04em] leading-tight">
              Delivery challenges MakZeon is built to solve.
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
              Representative engagements across PMO mobilisation, controls integration, programme recovery, contract assurance, and capability transfer for infrastructure, utilities, transport, and energy clients.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Evidence-led delivery</div>
                <h2 className="text-3xl font-extrabold text-white">From unclear status to controllable outcomes.</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] border transition-all duration-200 ${
                      activeCategory === cat
                        ? "bg-[#0ea5e9] text-[#050d1a] border-[#0ea5e9]"
                        : "border-[#0ea5e9]/20 text-slate-400 hover:border-[#0ea5e9]/50 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </FadeUp>

          <div className="grid gap-7 lg:grid-cols-2">
            {filtered.map((project, i) => (
              <FadeUp key={project.id} delay={i * 0.08}>
                <motion.article layout className="group h-full overflow-hidden border border-[#0ea5e9]/12 bg-[#071426] card-hover">
                  <div className="relative h-64 overflow-hidden">
                    <img src={project.image} alt={project.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-[#071426]/30 to-transparent" />
                    <div className="absolute left-5 top-5 font-command text-[10px] font-bold uppercase tracking-[0.18em] text-[#38bdf8] bg-[#050d1a]/90 border border-[#0ea5e9]/30 px-3 py-1">
                      {project.category}
                    </div>
                  </div>

                  <div className="p-7">
                    <h3 className="text-xl font-extrabold text-white mb-3 leading-tight">{project.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{project.description}</p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="border border-[#0ea5e9]/15 bg-[#050d1a] p-4">
                        <div className="mb-2 flex items-center gap-2 font-command text-[10px] uppercase tracking-[0.16em] text-[#0ea5e9]"><Target size={14} /> Focus</div>
                        <p className="text-sm text-slate-300">{project.focus}</p>
                      </div>
                      <div className="border border-[#0ea5e9]/15 bg-[#050d1a] p-4">
                        <div className="mb-2 flex items-center gap-2 font-command text-[10px] uppercase tracking-[0.16em] text-[#0ea5e9]"><BarChart3 size={14} /> Outcome</div>
                        <p className="text-sm text-slate-300">{project.outcome}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5 mb-6">
                      {project.tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-slate-400 bg-[#0ea5e9]/5 border border-[#0ea5e9]/10 px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link href="/contact" data-track={`case-study-${project.id}`} className="inline-flex items-center gap-1.5 text-[#0ea5e9] text-xs font-bold uppercase tracking-wide hover:gap-3 transition-all w-fit">
                      Discuss Similar Work <ChevronRight size={14} />
                    </Link>
                  </div>
                </motion.article>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#071426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="command-panel p-10 lg:p-14 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div>
                <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Have a live challenge?</div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-3">Bring the issue; MakZeon will map the control route.</h2>
                <p className="text-slate-400 max-w-2xl">
                  Whether you need an independent health check, urgent recovery support, or a scalable PMO partner, the fastest starting point is a short diagnostic conversation.
                </p>
              </div>
              <div className="shrink-0">
                <Link href="/contact" data-track="projects-cta" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0ea5e9] text-[#050d1a] font-bold text-sm uppercase tracking-wide hover:bg-[#38bdf8] transition-all blue-glow group">
                  Book a Delivery Diagnostic <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
