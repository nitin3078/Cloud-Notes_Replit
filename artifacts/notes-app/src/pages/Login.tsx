import React from 'react';
import { useAuth } from '@workspace/replit-auth-web';
import { BookOpen, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative notebook spine */}
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-sidebar border-r-2 border-border/60 shadow-[4px_0_12px_rgba(44,26,14,0.05)] z-0" />
      
      {/* Decorative stitches */}
      <div className="absolute left-3 md:left-6 top-12 bottom-12 flex flex-col justify-between z-10 opacity-20">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-2 md:w-4 h-1 bg-foreground rounded-full shadow-sm" />
        ))}
      </div>

      <div className="max-w-md w-full relative z-10 flex flex-col items-center text-center pl-8 md:pl-0 animate-in fade-in zoom-in-95 duration-700">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-primary/20 rotate-3 transition-transform hover:rotate-6">
          <BookOpen className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-4 tracking-tight">Folio</h1>
        
        <p className="text-lg text-muted-foreground mb-12 font-serif italic max-w-xs leading-relaxed">
          A deeply personal, warm space for your thoughts, ideas, and daily notes.
        </p>
        
        <button
          onClick={login}
          className="group bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full max-w-[240px] flex items-center justify-center gap-3 relative overflow-hidden"
        >
          <span className="relative z-10">Open Notebook</span>
          <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          {/* Button shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
        </button>
      </div>
    </div>
  );
}
