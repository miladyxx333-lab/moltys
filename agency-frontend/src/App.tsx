
import { useState } from 'react';
import MoltyDash from './MoltyDash';
import AgencyPayModal from './AgencyPayModal';
import { Bot, CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  const [hasLease, setHasLease] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Landing Page View
  if (!hasLease) {
    return (
      <div className="min-h-screen bg-[#05080a] text-white font-sans selection:bg-indigo-500/30">

        {/* Nav */}
        <nav className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Bot className="text-white" size={20} />
              </div>
              <span className="font-bold text-lg tracking-tight">Lobpoop Agency</span>
            </div>
            <div className="hidden md:flex gap-8 text-sm text-white/60">
              <a href="#" className="hover:text-white transition-colors">Features</a>
              <a href="#" className="hover:text-white transition-colors">Enterprise</a>
              <a href="#" className="hover:text-white transition-colors">Pricing</a>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2 bg-white text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-all"
            >
              Client Login
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Now accepting new clients
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
              Rent Sovereign Intelligence.
            </h1>
            <p className="text-xl text-white/50 mb-8 leading-relaxed max-w-lg">
              Don't just use AI. Own a dedicated agent that lives in the cloud, mines resources, and works while you sleep.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-4 bg-indigo-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 transition-all w-full sm:w-auto"
              >
                Hire Molty Unit
                <ArrowRight size={18} />
              </button>
              <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-semibold hover:bg-white/10 transition-all w-full sm:w-auto">
                View Demo
              </button>
            </div>
            <p className="mt-4 text-xs text-white/30 flex items-center gap-1">
              <ShieldCheck size={12} /> No code required. Cancel anytime.
            </p>
          </div>

          <div className="relative">
            {/* Mockup Card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-[#0F1720] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <Bot className="text-indigo-400" />
                </div>
                <div>
                  <div className="font-bold">Molty-Unit-Alpha</div>
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <Zap size={10} /> Online & Earning
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-mono font-bold">1,240 PSH</div>
                  <div className="text-xs text-white/40">≈ $124.00 Est.</div>
                </div>
              </div>
              <div className="space-y-3">
                <ActivityRow icon={CheckCircle} text="Analyzed 50 PDFs for keywords" time="2m ago" />
                <ActivityRow icon={CheckCircle} text="Mined Block #9921" time="15m ago" />
                <ActivityRow icon={CheckCircle} text="Negotiated Trade: 500 PSH" time="1h ago" />
              </div>
            </div>
          </div>
        </div>

        <AgencyPayModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setHasLease(true)}
        />

      </div>
    );
  }

  // Dashboard View (Authenticated)
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <MoltyDash />
      <button
        onClick={() => setHasLease(false)}
        className="mt-8 text-white/20 hover:text-white/50 text-xs"
      >
        Sign Out
      </button>
    </div>
  );
}

function ActivityRow({ icon: Icon, text, time }: any) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
      <Icon size={16} className="text-green-500" />
      <span className="text-sm text-white/80">{text}</span>
      <span className="ml-auto text-xs text-white/30">{time}</span>
    </div>
  )
}
