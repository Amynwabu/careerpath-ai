import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Clock, Calendar, ChevronRight } from "lucide-react";
import { insightsArticles } from "@/lib/data";

const categories = ["All", "Energy", "AI", "Infrastructure", "Consulting", "Training"];

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

export default function Insights() {
  const [activeCategory, setActiveCategory] = useState("All");
  const featured = insightsArticles.find((a) => a.featured)!;
  const secondary = insightsArticles.filter((a) => !a.featured);

  return (
    <div className="bg-[#080d1a]">
      {/* Page Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060b17]/97 via-[#060b17]/85 to-[#060b17]/50" />
        <div className="absolute inset-0 hero-grid-bg" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Thought Leadership</div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 max-w-2xl">Insights</h1>
            <p className="text-slate-300 text-lg max-w-xl">
              Perspectives on engineering, energy transition, AI transformation, and the future of project delivery.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Main content */}
            <div className="lg:col-span-2">
              {/* Featured Article */}
              <FadeUp>
                <div className="mb-14">
                  <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-5">Featured Article</div>
                  <div className="bg-[#0c1220] border border-[#0ea5e9]/10 overflow-hidden">
                    <div className="relative h-60 overflow-hidden">
                      <img
                        src={featured.image}
                        alt={featured.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c1220] to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#0ea5e9] bg-[#060b17]/90 border border-[#0ea5e9]/30 px-2.5 py-1">
                          {featured.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Calendar size={12} /> {featured.date}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Clock size={12} /> {featured.readTime}
                        </span>
                      </div>

                      <h2 className="text-white font-bold text-2xl mb-4 leading-tight">{featured.title}</h2>
                      <p className="text-slate-400 leading-relaxed mb-6">{featured.excerpt}</p>

                      {/* Article body preview */}
                      <div className="border-t border-[#0ea5e9]/10 pt-6 space-y-4">
                        {featured.body.split("\n\n").slice(0, 3).map((para, i) => {
                          if (para.startsWith("**") && para.endsWith("**")) {
                            return (
                              <h3 key={i} className="text-white font-semibold text-base">
                                {para.replace(/\*\*/g, "")}
                              </h3>
                            );
                          }
                          if (para.startsWith("**")) {
                            const parts = para.split("**");
                            return (
                              <p key={i} className="text-slate-400 text-sm leading-relaxed">
                                {parts.map((part, j) =>
                                  j % 2 === 1 ? <strong key={j} className="text-slate-200">{part}</strong> : part
                                )}
                              </p>
                            );
                          }
                          return <p key={i} className="text-slate-400 text-sm leading-relaxed">{para}</p>;
                        })}
                      </div>

                      <button className="inline-flex items-center gap-2 text-[#0ea5e9] text-sm font-semibold mt-6 hover:gap-3 transition-all">
                        Continue Reading <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </FadeUp>

              {/* Secondary Articles */}
              <FadeUp delay={0.1}>
                <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-5">More Articles</div>
              </FadeUp>
              <div className="space-y-6">
                {secondary.map((article, i) => (
                  <FadeUp key={article.id} delay={0.1 + i * 0.1}>
                    <div className="bg-[#0c1220] border border-[#0ea5e9]/10 overflow-hidden card-hover">
                      <div className="grid sm:grid-cols-3 gap-0">
                        <div className="relative overflow-hidden h-40 sm:h-auto">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0c1220]/30" />
                        </div>
                        <div className="sm:col-span-2 p-6">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#0ea5e9] bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 px-2 py-0.5">
                              {article.category}
                            </span>
                            <span className="text-slate-500 text-xs">{article.date}</span>
                            <span className="flex items-center gap-1 text-slate-500 text-xs">
                              <Clock size={11} /> {article.readTime}
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-base mb-2 leading-snug">{article.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{article.excerpt}</p>
                          <button className="inline-flex items-center gap-1.5 text-[#0ea5e9] text-xs font-semibold mt-4 hover:gap-2.5 transition-all">
                            Read More <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Recent Posts */}
              <FadeUp delay={0.2}>
                <div className="bg-[#0c1220] border border-[#0ea5e9]/10 p-6">
                  <h3 className="text-white font-semibold text-sm uppercase tracking-[0.1em] mb-5 pb-3 border-b border-[#0ea5e9]/10">
                    Recent Posts
                  </h3>
                  <div className="space-y-4">
                    {insightsArticles.map((article) => (
                      <div key={article.id} className="flex gap-3 group cursor-pointer">
                        <div className="w-14 h-14 shrink-0 overflow-hidden">
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div>
                          <p className="text-slate-300 text-xs font-medium leading-snug group-hover:text-[#0ea5e9] transition-colors line-clamp-2">
                            {article.title}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">{article.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* Categories */}
              <FadeUp delay={0.3}>
                <div className="bg-[#0c1220] border border-[#0ea5e9]/10 p-6">
                  <h3 className="text-white font-semibold text-sm uppercase tracking-[0.1em] mb-5 pb-3 border-b border-[#0ea5e9]/10">
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`text-xs px-3 py-1.5 border transition-all ${
                          activeCategory === cat
                            ? "bg-[#0ea5e9] text-[#060b17] border-[#0ea5e9] font-semibold"
                            : "border-[#0ea5e9]/20 text-slate-400 hover:border-[#0ea5e9]/50 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </FadeUp>

              {/* CTA */}
              <FadeUp delay={0.4}>
                <div className="bg-[#0c1220] border border-[#0ea5e9]/20 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 border-l border-b border-[#0ea5e9]/10" />
                  <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.15em] mb-3">Talk to Us</div>
                  <h3 className="text-white font-bold text-lg mb-3">Have a project?</h3>
                  <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                    Discuss how MakZeon can support your goals.
                  </p>
                  <Link
                    href="/contact"
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0ea5e9] text-[#060b17] font-semibold text-xs uppercase tracking-wide hover:bg-[#38bdf8] transition-all"
                  >
                    Book Consultation <ArrowRight size={13} />
                  </Link>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
