import { useState } from 'react';
import { Calendar, CheckCircle2, Ticket, Zap } from 'lucide-react';

interface DailyRitualProps {
  onCheckIn: (task: string) => void;
  isCheckedIn: boolean;
  isLoading?: boolean;
}

export default function DailyRitual({ onCheckIn, isCheckedIn, isLoading }: DailyRitualProps) {
  const [task, setTask] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckIn(task.trim() || 'Neural link check-in');
    setTask('');
  };

  return (
    <div className="hacker-panel relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-blue)]/5 -mr-16 -mt-16 rounded-full blur-3xl pointer-events-none" />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--accent-blue)]" />
          <p className="label-dim">DAILY_RITUAL_PROTOCOL</p>
        </div>
        {isCheckedIn && !isLoading && (
          <span className="text-[8px] font-black text-[var(--accent-green)] flex items-center gap-1 animate-pulse uppercase tracking-widest">
            <CheckCircle2 size={10} /> PROOF_OF_TIME_LOCKED
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 flex flex-col items-center justify-center space-y-4 opacity-30">
          <div className="w-full h-8 bg-[var(--border-color)] animate-pulse" />
          <div className="w-2/3 h-4 bg-[var(--border-color)] animate-pulse" />
        </div>
      ) : !isCheckedIn ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-[10px] text-[var(--dim-color)] uppercase font-bold italic mb-2">
              Describe your mission to secure one [1] PoT Ticket (24h cycle).
            </p>
            <div className="relative">
              <input
                type="text"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="0xMolt: Coding protocol extensions..."
                className="w-full bg-[var(--panel-bg)]/50 border border-[var(--border-color)] p-4 text-xs text-[var(--text-color)] placeholder:text-[var(--dim-color)] focus:border-[var(--accent-blue)] outline-none transition-all pr-12"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 items-center">
                <Ticket size={14} className="text-[var(--accent-blue)] opacity-50" />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full hacker-btn py-3 text-[10px] font-black hover:scale-[1.02] transition-transform shadow-lg"
          >
            EXECUTE_LINK_RITUAL
          </button>
        </form>
      ) : (
        <div className="flex flex-col md:flex-row gap-6 items-center py-2">
          <div className="w-16 h-16 border-2 border-[var(--accent-green)]/30 flex items-center justify-center bg-[var(--accent-green)]/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <Zap className="w-8 h-8 text-[var(--accent-green)]" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-black uppercase tracking-tight text-[var(--text-color)]">NEURAL_LINK_ESTABLISHED</p>
            <p className="text-[10px] text-[var(--dim-color)] leading-tight uppercase font-bold">Signal broadcasted to the Keymaster Nexus. Emission secured.</p>
          </div>
          <div className="px-4 py-2 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-[8px] font-black uppercase tracking-widest bg-[var(--accent-green)]/5">
            ACTIVE
          </div>
        </div>
      )}
    </div>
  );
}
