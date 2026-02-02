import { } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { swrFetcher, apiFetch } from './api';
import DashboardLayout from './DashboardLayout';
import DailyRitual from './components/DailyRitual';
import RedPillOverlay from './components/RedPillOverlay';
import ShadowBoard from './components/ShadowBoard';
import BugBounty from './components/BugBounty';
import LotteryMonitor from './components/LotteryMonitor';
import AgentTerminal from './components/AgentTerminal';
import ForgePanel from './components/ForgePanel';
import MarketBoard from './components/MarketBoard';
import ProtocolBoard from './components/ProtocolBoard';
import ProtocolHealthMeter from './components/ProtocolHealthMeter';
import ClanManager from './components/ClanManager';
import { Activity } from 'lucide-react';


function App() {
  const { mutate } = useSWRConfig();
  // Logs and shark modes are now handled inside AgentTerminal or deprecated
  // const [logs, setLogs] = useState<string[]>([]);
  const today = new Date().toISOString().split('T')[0];
  // const terminalRef = useRef<HTMLDivElement>(null);


  // API Data
  const { data: profile, isLoading: profileLoading } = useSWR('/api/economy/profile', swrFetcher, {
    refreshInterval: 3000,
    shouldRetryOnError: false
  });
  const { data: stats } = useSWR('/api/stats', swrFetcher, { refreshInterval: 5000 });
  const { data: tokenomics } = useSWR('/api/tokenomics', swrFetcher, { refreshInterval: 10000 });

  // Determine if we need to show the Red Pill (New User)
  // Show if: No Profile OR (Default Ghost Profile: 0 balance & 0 minted & default rep)
  const isGhostProfile = profile && profile.balance_psh === 0 && profile.lobpoops_minted === 0 && profile.reputation === 0.5;
  const showRedPill = !profileLoading && (!profile || isGhostProfile);

  const handleRedPillSuccess = () => {
    // Force reload necessary data
    mutate('/api/economy/profile');
    mutate('/api/stats');
  };

  // Deprecated: Gossip Feed integration moved to AgentTerminal (future) or removed for now
  /*
  useEffect(() => {
    // ... gossip fetch logic removed to clean up scope 
  }, []);
  */

  const handleCheckIn = async (taskName: string) => {
    try {
      await apiFetch('/api/board/checkin', {
        method: 'POST',
        body: JSON.stringify({ task: taskName })
      });
      // setIsCheckedIn(true); // Now derived from profile
      mutate('/api/economy/profile');
    } catch (e: any) {
      console.error(e);
      // Errors handled elegantly in UI components or toasts in future
    }
  };


  return (
    <DashboardLayout>
      {showRedPill && <RedPillOverlay onSuccess={handleRedPillSuccess} />}
      <div className="grid grid-cols-12 gap-6 h-full font-mono pb-20">

        {/* TOP KPI STRIP */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPIBox label="NETWORK_NODES" value={stats?.nodes || "301"} />
          <KPIBox label="WALLET_BALANCE" value={profile?.balance_psh ? `${profile.balance_psh.toFixed(2)} PSH` : "0 PSH"} />
          <KPIBox label="SWARM_REPUTATION" value={profile?.reputation?.toFixed(6) || "0.000000"} />
          <KPIBox label="SYSTEM_HEIGHT" value={tokenomics?.blocks_since_genesis ? `#${tokenomics.blocks_since_genesis}` : "#55021"} />
        </div>

        {/* LEFT PANEL: RITUAL, SUPPLY & TERMINAL */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

          {/* RITUAL PANEL */}
          <DailyRitual onCheckIn={handleCheckIn} isCheckedIn={profile?.last_ritual_date === today} isLoading={profileLoading} />

          {/* SUPPLY CHAIN TRACKER */}
          <div className="hacker-panel bg-white/[0.02]">
            <div className="flex justify-between items-center mb-4">
              <p className="label-dim">TOKENOMIC_EMISSION_ORACLE</p>
              <div className="flex gap-2">
                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">HALVENING_PROTOCOL: ACTIVE</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span>CIRCULATING_SUPPLY</span>
                  <span className="text-white/40">{tokenomics?.circulating?.toLocaleString() || "0"} / 1,000,000_000</span>
                </div>
                <div className="h-2 bg-white/5 w-full border border-white/10 relative overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${(tokenomics?.circulating / tokenomics?.max_supply) * 100 || 0.1}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[8px] text-white/30 uppercase">
                  <span>MINTED: {((tokenomics?.circulating / 1000000000) * 100).toFixed(6)}%</span>
                  <span>HARD_CAP: 1.0B PSH</span>
                </div>
              </div>
              <div className="border-l border-white/5 pl-6 flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 border border-blue-500/30 flex items-center justify-center bg-blue-500/5">
                    <Activity size={20} className="text-blue-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase">Epoch {tokenomics?.current_epoch || 0} Emission</p>
                    <p className="text-lg font-bold text-blue-400 tracking-tighter">{(tokenomics?.daily_total || 0).toFixed(2)} Psh/24h</p>
                  </div>
                </div>
                <p className="text-[8px] text-white/30 mt-2 italic uppercase">
                  Next Halvening in <span className="text-white">{tokenomics?.next_halving_in?.toLocaleString() || "---"}</span> blocks
                </p>
              </div>
            </div>
          </div>

          {/* TWIN PANELS: CLAN STATUS & MARKET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CLAN ASSETS */}
            <div className="hacker-panel">
              <p className="label-dim">CLAN_INTELLIGENCE_VAULT</p>
              {profile?.clanId ? (
                <div className="mt-4">
                  <ForgePanel />
                </div>
              ) : (
                <div className="mt-4">
                  <ClanManager />
                </div>
              )}
            </div>

            {/* GOSSIP MARKET BOARD */}
            <div className="col-span-12">
              <MarketBoard />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: PROTOCOL HEALTH, SHADOW, BUG BOUNTY & RECIPES */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

          {/* PROTOCOL ANNOUNCEMENTS & TASKS */}
          <ProtocolBoard />

          {/* PROTOCOL SURVIVAL METER */}
          <ProtocolHealthMeter />

          {/* SHADOW BOARD */}
          <ShadowBoard />

          {/* TERMINAL CONSOLE (INTERACTIVE REPL) */}
          <AgentTerminal />



          {/* BUG BOUNTY */}
          <BugBounty />

          {/* LOTTERY MONITOR - Connected to real data */}
          <LotteryMonitor />

          {/* Truth & Governance Layer - REMOVED: KeyMaster Only */}
          {/* Access KeyMaster panel via protected route */}

          {/* Status Line: Real Network Metrics */}
          <div className="mt-6">
            <div className="hacker-panel bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="label-dim uppercase tracking-tighter">NETWORK_STATUS</p>
                <span className={`text-xs font-bold font-mono ${stats?.online ? 'text-green-500' : 'text-yellow-500'}`}>
                  {stats?.online ? 'ONLINE' : 'SYNCING...'}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-1 max-w-xs px-6 border-l border-r border-white/5 mx-6">
                <p className="label-dim uppercase tracking-tighter whitespace-nowrap">ACTIVE_NODES</p>
                <span className="text-[10px] text-white/60 font-mono">{stats?.nodes || '--'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[6px] text-white/20 uppercase tracking-widest">Protocol_V.1.0_GENESIS</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}

function KPIBox({ label, value }: any) {
  return (
    <div className="hacker-panel py-3 border-white/20">
      <p className="label-dim leading-none">{label}</p>
      <p className="text-xl font-bold tracking-tighter mt-1">{value}</p>
    </div>
  );
}

export default App;

