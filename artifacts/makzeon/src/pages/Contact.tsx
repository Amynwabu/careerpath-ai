import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { contactInfo } from "@/lib/data";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  company: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormData = z.infer<typeof schema>;

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

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source: "makzeon-website", submittedAt: new Date().toISOString() }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "We could not send your message. Please email info@makzeon.com directly.");
      }

      reset();
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your message. Please email info@makzeon.com directly.");
    }
  };

  return (
    <div className="bg-[#080d1a]">
      {/* Page Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060b17]/97 via-[#060b17]/85 to-[#060b17]/50" />
        <div className="absolute inset-0 hero-grid-bg" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Get In Touch</div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 max-w-2xl">Contact Us</h1>
            <p className="text-slate-300 text-lg max-w-xl">
              We're ready to discuss how MakZeon can support your next project. Send us a message and we'll be in touch within one business day.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <FadeUp>
                <div className="bg-[#0c1220] border border-[#0ea5e9]/10 p-8 lg:p-10">
                  <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Project Enquiry</div>
                  <h2 className="text-white font-bold text-2xl mb-8">Send us a message</h2>

                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <CheckCircle2 size={48} className="text-[#0ea5e9] mb-4" />
                      <h3 className="text-white font-bold text-xl mb-2">Message received</h3>
                      <p className="text-slate-400 max-w-sm">
                        Thank you for reaching out. A member of the MakZeon team will be in contact with you within one business day.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmit(onSubmit, () => setSubmitError(null))}
                      className="space-y-5"
                    >
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-slate-300 text-xs font-medium uppercase tracking-[0.1em] mb-2">
                            Full Name <span className="text-[#0ea5e9]">*</span>
                          </label>
                          <input
                            {...register("name")}
                            placeholder="Your full name"
                            className="w-full bg-[#080d1a] border border-[#0ea5e9]/15 text-white placeholder-slate-600 px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                          />
                          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                          <label className="block text-slate-300 text-xs font-medium uppercase tracking-[0.1em] mb-2">
                            Email Address <span className="text-[#0ea5e9]">*</span>
                          </label>
                          <input
                            {...register("email")}
                            type="email"
                            placeholder="you@company.com"
                            className="w-full bg-[#080d1a] border border-[#0ea5e9]/15 text-white placeholder-slate-600 px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                          />
                          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-slate-300 text-xs font-medium uppercase tracking-[0.1em] mb-2">
                            Company / Organisation
                          </label>
                          <input
                            {...register("company")}
                            placeholder="Your organisation"
                            className="w-full bg-[#080d1a] border border-[#0ea5e9]/15 text-white placeholder-slate-600 px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 text-xs font-medium uppercase tracking-[0.1em] mb-2">
                            Phone Number
                          </label>
                          <input
                            {...register("phone")}
                            placeholder="+44 ..."
                            className="w-full bg-[#080d1a] border border-[#0ea5e9]/15 text-white placeholder-slate-600 px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 text-xs font-medium uppercase tracking-[0.1em] mb-2">
                          Message <span className="text-[#0ea5e9]">*</span>
                        </label>
                        <textarea
                          {...register("message")}
                          rows={6}
                          placeholder="Tell us about your project, challenge, or how we can help..."
                          className="w-full bg-[#080d1a] border border-[#0ea5e9]/15 text-white placeholder-slate-600 px-4 py-3 text-sm focus:outline-none focus:border-[#0ea5e9]/50 transition-colors resize-none"
                        />
                        {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message.message}</p>}
                      </div>

                      {submitError && (
                        <div className="border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                          {submitError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3.5 bg-[#0ea5e9] text-[#060b17] font-semibold text-sm uppercase tracking-wide hover:bg-[#38bdf8] transition-all blue-glow disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? "Sending..." : <>Send Message <Send size={15} /></>}
                      </button>
                    </form>
                  )}
                </div>
              </FadeUp>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <FadeUp delay={0.15}>
                <div className="bg-[#0c1220] border border-[#0ea5e9]/10 p-7">
                  <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-5">Contact Information</div>
                  <div className="space-y-5">
                    {[
                      { icon: Mail, label: "Email", value: contactInfo.email, href: `mailto:${contactInfo.email}` },
                      { icon: Phone, label: "Phone", value: contactInfo.phone, href: `tel:${contactInfo.phone}` },
                      { icon: MapPin, label: "Location", value: contactInfo.location, href: undefined },
                      { icon: Clock, label: "Business Hours", value: contactInfo.hours, href: undefined },
                    ].map(({ icon: Icon, label, value, href }) => (
                      <div key={label} className="flex items-start gap-4">
                        <div className="w-9 h-9 border border-[#0ea5e9]/25 flex items-center justify-center shrink-0 bg-[#0ea5e9]/5">
                          <Icon size={15} className="text-[#0ea5e9]" />
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">{label}</p>
                          {href ? (
                            <a href={href} className="text-slate-200 text-sm hover:text-[#0ea5e9] transition-colors">
                              {value}
                            </a>
                          ) : (
                            <p className="text-slate-200 text-sm">{value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>

              <FadeUp delay={0.25}>
                <div className="bg-[#0c1220] border border-[#0ea5e9]/20 p-7 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 border-l border-b border-[#0ea5e9]/10" />
                  <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Quick Enquiry</div>
                  <h3 className="text-white font-bold text-lg mb-3">Book a Delivery Diagnostic</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">
                    Prefer to reach us directly? Email us about your Delivery Diagnostic and a member of our team will respond within one business day.
                  </p>
                  <a
                    href={`mailto:${contactInfo.email}?subject=Delivery Diagnostic Request`}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0ea5e9] text-[#060b17] font-semibold text-xs uppercase tracking-wide hover:bg-[#38bdf8] transition-all"
                  >
                    <Mail size={13} /> Email Us Directly
                  </a>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
