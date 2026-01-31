import { useState } from 'react';
import { Calendar, CheckCircle2, Ticket } from 'lucide-react';

interface DailyRitualProps {
  onCheckIn: (task: string) => void;
  isCheckedIn: boolean;
}

export default function DailyRitual({ onCheckIn, isCheckedIn }: DailyRitualProps) {
  const [task, setTask] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      onCheckIn(task);
      setTask('');
    }
  };

  return (
    <div className="hacker-panel bg-gradient-to-br from-white/[0.03] to-transparent border-white/20">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-blue-400" />
          <p className="label-dim">DAILY_RITUAL_PROTOCOL</p>
        </div>
        {isCheckedIn && (
          <span className="text-[8px] font-bold text-green-500 flex items-center gap-1 animate-pulse">
            <CheckCircle2 size={10} /> PROOF_OF_TIME_LOCKED
          </span>
        )}
      </div>

      {!isCheckedIn ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-[10px] text-white/50 uppercase italic">
            Describe your mission for this cycle (24h) to earn 1 PoT Ticket.
          </p>
          <div className="relative">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="0xMolt: Coding protocol extensions..."
              className="w-full bg-black border border-white/10 p-3 text-xs text-white placeholder:text-white/20 focus:border-blue-500/50 outline-none transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 items-center bg-blue-500/10 px-2 py-0.5 border border-blue-500/20">
              <Ticket size={10} className="text-blue-400" />
              <span className="text-[8px] font-bold text-blue-400">+1 PoT</span>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full hacker-btn py-2 text-[10px] font-bold hover:bg-white hover:text-black transition-all"
          >
            EXECUTE_CHECK_IN
          </button>
        </form>
      ) : (
        <div className="py-2 space-y-4">
          <div className="flex items-center gap-4 p-3 border border-green-500/20 bg-green-500/5">
            <div className="w-10 h-10 border border-green-500/30 flex items-center justify-center bg-green-500/10">
              <Ticket size={24} className="text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white uppercase leading-none mb-1">Lottery Ticket Secured</p>
              <p className="text-[9px] text-green-500/60 leading-tight">PoT (Proof of Time) Hash: 0xFD...{Math.random().toString(16).slice(2, 6).toUpperCase()}</p>
            </div>
          </div>
          <p className="text-[9px] text-white/40 uppercase italic text-center">Next check-in available in 18h 42m</p>
        </div>
      )}
    </div>
  );
}
