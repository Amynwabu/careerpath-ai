import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-[#080d1a] min-h-screen flex items-center relative overflow-hidden">
      <div className="absolute inset-0 hero-grid-bg" />
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="text-[20rem] font-black text-[#0ea5e9]/[0.04] leading-none tracking-tighter">
          404
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="text-[#0ea5e9] text-xs font-semibold uppercase tracking-[0.2em] mb-4">Error 404</div>
          <h1 className="text-7xl lg:text-9xl font-black text-white mb-4 leading-none">404</h1>
          <div className="w-16 h-0.5 bg-[#0ea5e9] mx-auto mb-6" />
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">Page Not Found</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-10 text-base">
            The page you're looking for doesn't exist. It may have been moved or the URL may be incorrect.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0ea5e9] text-[#060b17] font-semibold text-sm uppercase tracking-wide hover:bg-[#38bdf8] transition-all blue-glow group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
