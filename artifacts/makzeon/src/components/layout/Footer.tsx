import { Link } from "wouter";
import { Linkedin, Twitter, Facebook, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#060b17] border-t border-[#0ea5e9]/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 relative">
                <div className="absolute inset-0 border-2 border-[#0ea5e9] rotate-45" />
                <div className="absolute inset-[4px] bg-[#0ea5e9] rotate-45" />
              </div>
              <span className="text-white font-bold text-lg tracking-[0.15em] uppercase">
                MAK<span className="text-[#0ea5e9]">ZEON</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
              Engineering Intelligence. Delivering integrated engineering, AI, and project delivery services across energy and infrastructure sectors.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Twitter, label: "Twitter" },
                { icon: Facebook, label: "Facebook" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 border border-[#0ea5e9]/30 flex items-center justify-center text-slate-400 hover:text-[#0ea5e9] hover:border-[#0ea5e9] transition-colors"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.15em] mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: "Home", href: "/" },
                { label: "About", href: "/about" },
                { label: "Projects", href: "/projects" },
                { label: "Insights", href: "/insights" },
                { label: "Careers", href: "/contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-slate-400 text-sm hover:text-[#0ea5e9] transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.15em] mb-4">Services</h4>
            <ul className="space-y-2">
              {[
                "Engineering Intelligence",
                "AI & Consulting",
                "Project Delivery",
                "Training & Capability",
              ].map((s) => (
                <li key={s}>
                  <Link
                    href="/services"
                    className="text-slate-400 text-sm hover:text-[#0ea5e9] transition-colors"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.15em] mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Mail size={13} className="text-[#0ea5e9] mt-0.5 shrink-0" />
                <a href="mailto:info@makzeon.com" className="text-slate-400 text-sm hover:text-[#0ea5e9] transition-colors">
                  info@makzeon.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={13} className="text-[#0ea5e9] mt-0.5 shrink-0" />
                <a href="tel:+443300438282" className="text-slate-400 text-sm hover:text-[#0ea5e9] transition-colors">
                  +44 330 043 8282
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={13} className="text-[#0ea5e9] mt-0.5 shrink-0" />
                <span className="text-slate-400 text-sm">London, United Kingdom</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#0ea5e9]/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} MakZeon. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-500 text-xs hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-500 text-xs hover:text-slate-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
