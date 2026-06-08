import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { navItems } from "@/lib/data";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080d1a]/95 backdrop-blur-md border-b border-[#0ea5e9]/20 shadow-lg shadow-black/40"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 relative">
              <div className="absolute inset-0 border-2 border-[#0ea5e9] rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
              <div className="absolute inset-[5px] bg-[#0ea5e9] rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
            </div>
            <span className="text-white font-bold text-lg tracking-[0.15em] uppercase">
              MAK<span className="text-[#0ea5e9]">ZEON</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors duration-200 ${
                  location === item.href
                    ? "text-[#0ea5e9]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center">
            <Link
              href="/contact"
              className="px-5 py-2 bg-[#0ea5e9] text-[#080d1a] text-sm font-semibold tracking-wide uppercase hover:bg-[#38bdf8] transition-all duration-200 blue-glow-hover"
            >
              Book Consultation
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-slate-300 hover:text-white p-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-[#080d1a]/98 border-t border-[#0ea5e9]/20">
          <div className="px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 text-sm font-medium tracking-wide border-l-2 transition-colors ${
                  location === item.href
                    ? "border-[#0ea5e9] text-[#0ea5e9] bg-[#0ea5e9]/5"
                    : "border-transparent text-slate-300 hover:text-white hover:border-slate-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2">
              <Link
                href="/contact"
                className="block w-full text-center px-5 py-3 bg-[#0ea5e9] text-[#080d1a] text-sm font-semibold tracking-wide uppercase hover:bg-[#38bdf8] transition-colors"
              >
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
