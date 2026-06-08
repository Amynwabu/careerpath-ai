import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ArrowRight, CheckCircle2, Shield, Star, TrendingUp, Users } from "lucide-react";
import { aboutProofPoints, metrics, values, whyMakzeon } from "@/lib/data";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Star,
  Users,
  Shield,
  TrendingUp,
};

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

export default function About() {
  return (
    <div className="bg-[#050d1a]">
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1800&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050d1a]/98 via-[#050d1a]/88 to-[#050d1a]/58" />
        <div className="absolute inset-0 hero-grid-bg" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-4xl">
            <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-4">About MakZeon</div>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-white mb-6 tracking-[-0.04em] leading-tight">
              Delivery confidence for high-stakes infrastructure.
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
              MakZeon is a specialist project management and consulting firm helping energy, utility, and infrastructure organisations strengthen governance, improve controls, manage risk, and deliver complex capital programmes.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_0.9fr] gap-16 items-center">
            <FadeUp>
              <div>
                <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Our Position</div>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-6">Specialist. Scalable. Sector-focused.</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  MakZeon exists for organisations that cannot afford blind spots in governance, controls, reporting, risk, or contract management. We bring the discipline of a mature PMO and the responsiveness of a specialist consultancy.
                </p>
                <p className="text-slate-400 leading-relaxed mb-8">
                  Our PMO-as-a-Service model gives clients the structure, cadence, and insight of a high-performing delivery function without the fixed cost and delay of building permanent overhead before it is needed.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {aboutProofPoints.map((point) => (
                    <div key={point} className="flex items-start gap-3 border border-[#0ea5e9]/15 bg-[#071426] p-4">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#0ea5e9]" />
                      <span className="text-sm leading-relaxed text-slate-300">{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.2}>
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-20 h-20 border border-[#0ea5e9]/15" />
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/93064684/35MjLzcC2BmoEYM5pz8t7z/makzeon-about-visual-FwxmYpUsp5mzrtaFdxbSXN.webp" alt="MakZeon project delivery command centre" className="w-full h-[500px] object-cover opacity-90" />
                <div className="absolute -bottom-4 -right-4 w-20 h-20 border border-[#0ea5e9]/15" />
                <div className="absolute bottom-6 left-6 right-6 command-panel p-5">
                  <p className="font-command text-xs uppercase tracking-[0.22em] text-[#0ea5e9]">Operating principle</p>
                  <p className="mt-2 text-lg font-bold text-white">Make the true project position visible early enough to act.</p>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#071426] grid-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="max-w-3xl mb-14">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Why MakZeon</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">Built around delivery confidence, not consultancy theatre.</h2>
              <p className="text-slate-400 leading-relaxed">
                We embed practical operating discipline into the programme so executives can trust the information they receive, teams can focus on the right risks, and commercial value is protected.
              </p>
            </div>
          </FadeUp>
          <div className="grid gap-px bg-[#0ea5e9]/15 md:grid-cols-2 lg:grid-cols-3">
            {whyMakzeon.map((item, index) => (
              <FadeUp key={item.title} delay={index * 0.06}>
                <div className="h-full bg-[#050d1a] p-7 card-hover">
                  <div className="font-command mb-5 text-xs font-bold text-[#0ea5e9]">{item.num}</div>
                  <h3 className="text-lg font-extrabold text-white mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="text-center mb-16">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Values</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white">How we work</h2>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, i) => {
              const Icon = iconMap[val.icon];
              return (
                <FadeUp key={val.title} delay={i * 0.1}>
                  <div className="border border-[#0ea5e9]/15 p-8 card-hover bg-[#071426] h-full">
                    <div className="w-11 h-11 border border-[#0ea5e9]/30 flex items-center justify-center mb-5 bg-[#0ea5e9]/5">
                      {Icon && <Icon size={20} className="text-[#0ea5e9]" />}
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-3">{val.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{val.description}</p>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 border-y border-[#0ea5e9]/15 bg-[#071426]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#0ea5e9]/20">
            {metrics.map((m, i) => (
              <FadeUp key={m.label} delay={i * 0.1}>
                <div className="bg-[#050d1a] p-8 text-center">
                  <div className="font-command text-4xl lg:text-5xl font-bold text-[#38bdf8] mb-2">{m.value}</div>
                  <div className="text-slate-400 text-sm">{m.label}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeUp>
            <h2 className="text-3xl font-extrabold text-white mb-4">Ready to test the health of your programme?</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Start with a focused diagnostic and get an independent view of the governance, controls, risk, and contract signals that matter.
            </p>
            <Link href="/contact" data-track="book-diagnostic" className="inline-flex items-center gap-2 px-8 py-4 bg-[#0ea5e9] text-[#050d1a] font-bold text-sm uppercase tracking-wide hover:bg-[#38bdf8] transition-all blue-glow group">
              Book Diagnostic <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
