import { useRef } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Activity, FileSearch, Radar, Gauge, Sparkles } from "lucide-react";
import { services, signatureOffers, faqs } from "@/lib/data";

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
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

const serviceIcons = [ShieldCheck, Gauge, Clock3, Radar, Activity, FileSearch];

export default function Services() {
  return (
    <div className="bg-[#050d1a]">
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1800&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050d1a]/98 via-[#050d1a]/88 to-[#050d1a]/62" />
        <div className="absolute inset-0 hero-grid-bg" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-4xl">
            <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-4">Services</div>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-white mb-6 tracking-[-0.04em] leading-tight">
              Scalable delivery control for complex capital programmes.
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
              MakZeon provides integrated PMO, project controls, planning, reporting, risk, assurance, and contract management capability for organisations that need delivery confidence without permanent overhead.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="max-w-3xl mb-14">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Core Services</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">One operating model. Six connected disciplines.</h2>
              <p className="text-slate-400 leading-relaxed">
                Each service can be delivered independently or combined into a Controls360 model that connects cost, schedule, risk, change, contract, and reporting signals into one trusted view.
              </p>
            </div>
          </FadeUp>

          <div className="space-y-10">
            {services.map((service, index) => {
              const Icon = serviceIcons[index] || ShieldCheck;
              return (
                <FadeUp key={service.id} delay={index * 0.05}>
                  <article className="grid overflow-hidden border border-[#0ea5e9]/15 bg-[#071426] lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="relative min-h-[320px] overflow-hidden">
                      <img src={service.image} alt={service.title} className="h-full w-full object-cover opacity-75 transition-transform duration-500 hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071426] via-transparent" />
                      <div className="absolute left-6 top-6 flex flex-wrap gap-2">
                        <span className="font-command border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#38bdf8]">
                          {service.tag.replace(" · AI", "")}
                        </span>
                        {service.tag.includes("AI") && (
                          <span className="font-command border border-[#38bdf8]/40 bg-[#38bdf8]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7dd3fc]">
                            AI-Powered
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-7 md:p-9">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center border border-[#0ea5e9]/30 bg-[#0ea5e9]/5">
                        <Icon size={22} className="text-[#0ea5e9]" />
                      </div>
                      <h3 className="text-2xl font-extrabold text-white">{service.title}</h3>
                      <p className="mt-2 text-[#38bdf8] font-semibold">{service.subtitle}</p>
                      <p className="mt-5 text-sm leading-relaxed text-slate-400">{service.description}</p>
                      <div className="mt-7 grid gap-3 sm:grid-cols-2">
                        {service.capabilities.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
                            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#0ea5e9]" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-[#0ea5e9]/15 bg-[#071426] py-24">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="mb-14 max-w-3xl">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Signature Offers</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">Fixed-scope offers that create immediate delivery traction.</h2>
              <p className="text-slate-400 leading-relaxed">
                Start with a diagnostic, mobilise a PMO, integrate controls, recover a distressed programme, strengthen contract confidence, or transfer capability to your internal team.
              </p>
            </div>
          </FadeUp>

          <div className="grid gap-px bg-[#0ea5e9]/15 sm:grid-cols-2 lg:grid-cols-3">
            {signatureOffers.map((offer, index) => (
              <FadeUp key={offer.name} delay={index * 0.06}>
                <div className={`h-full p-7 ${offer.featured ? "bg-[#0ea5e9] text-[#050d1a]" : "bg-[#050d1a] text-slate-300"}`}>
                  <div className={`font-command mb-4 text-[10px] font-bold uppercase tracking-[0.22em] ${offer.featured ? "text-[#050d1a]" : "text-[#0ea5e9]"}`}>
                    {offer.duration}
                  </div>
                  <div className="mb-5 flex h-11 w-11 items-center justify-center border border-current/30">
                    <Sparkles size={18} />
                  </div>
                  <h3 className={`text-xl font-extrabold ${offer.featured ? "text-[#050d1a]" : "text-white"}`}>{offer.name}</h3>
                  <p className={`mt-2 text-sm font-semibold ${offer.featured ? "text-[#08203b]" : "text-[#38bdf8]"}`}>{offer.tagline}</p>
                  <p className={`mt-5 text-sm leading-relaxed ${offer.featured ? "text-[#08203b]" : "text-slate-400"}`}>{offer.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#050d1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="mb-12 max-w-3xl">
              <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">FAQ</div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">Common questions before a Delivery Diagnostic.</h2>
              <p className="text-slate-400 leading-relaxed">
                Straight answers to the mobilisation, scale, NEC contract, recovery, and PMO overhead questions sponsors usually raise before engaging MakZeon.
              </p>
            </div>
          </FadeUp>

          <div className="grid gap-px border border-[#0ea5e9]/15 bg-[#0ea5e9]/15 lg:grid-cols-2">
            {faqs.map((item, index) => (
              <FadeUp key={item.question} delay={index * 0.05}>
                <article className="h-full bg-[#071426] p-7">
                  <div className="font-command mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0ea5e9]">Question {String(index + 1).padStart(2, "0")}</div>
                  <h3 className="text-lg font-extrabold text-white">{item.question}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">{item.answer}</p>
                </article>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 hero-grid-bg opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="command-panel p-8 md:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-2xl">
                <div className="font-command text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.24em] mb-3">Next step</div>
                <h2 className="text-3xl font-extrabold text-white mb-3">Start with a Delivery Diagnostic.</h2>
                <p className="text-slate-400 leading-relaxed">
                  In two to four weeks, MakZeon can give you an independent view of project health, control gaps, risk exposure, and practical recovery priorities.
                </p>
              </div>
              <Link href="/contact" data-track="book-diagnostic" className="mt-8 inline-flex items-center gap-2 bg-[#0ea5e9] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-[#050d1a] transition-all hover:bg-[#38bdf8] lg:mt-0">
                Book a Delivery Diagnostic <ArrowRight size={16} />
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
