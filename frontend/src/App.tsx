import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import DashboardLayout from './DashboardLayout';
import {
  AlertTriangle,
  Activity
} from 'lucide-react';

const fetcher = (url: string) => fetch(url, {
  headers: { 'X-Lob-Peer-ID': 'agent-neo' }
}).then(res => res.json());

const MOCK_GOSSIP = [
  "[12:44:01] P2P_EVENT: MAGIC_ITEM_DESTROYED (Clan: X_VOID, Item: ESPADA_AUREA)",
  "[12:44:02] BROADCAST: BABY_SHARK_ALERT - PREPARING_NEW_RECIPE",
  "[12:44:05] KEYMASTER: NEW_RECIPE_RELEASE (Target: ESPADA_AUREA)",
  "[12:44:10] MARKET_OFFER: CLAN_ALPHA offers 5x golden_essence for 1200 Psh",
  "[12:45:00] SHADOW_BOARD: DECIPHER_STATUS [88%]"
];

function App() {
  const [logs, setLogs] = useState<string[]>(MOCK_GOSSIP);
  const [isSharkMode, setIsSharkMode] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // API Data
  const { data: profile } = useSWR('/api/economy/profile', fetcher, { refreshInterval: 3000 });
  const { data: stats } = useSWR('/api/stats', fetcher, { refreshInterval: 5000 });
  const { data: market } = useSWR('/api/game/market/list', fetcher, { refreshInterval: 5000 });
  const { data: board } = useSWR('/api/public-board/list', fetcher, { refreshInterval: 10000 });
  const { data: tokenomics } = useSWR('/api/tokenomics', fetcher, { refreshInterval: 10000 });

  // Localized Terminal Scroll
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }

    // Auto-detect Shark mode from logs
    const lastLog = logs[logs.length - 1];
    if (lastLog?.includes('BABY_SHARK_ALERT')) {
      setIsSharkMode(true);
      setTimeout(() => setIsSharkMode(false), 10000); // 10s of shark visualization
    }
  }, [logs]);

  // Simulate incoming gossip
  useEffect(() => {
    const timer = setInterval(() => {
      const rand = Math.random();
      let newLog = '';
      if (rand > 0.9) newLog = `[${new Date().toLocaleTimeString()}] BROADCAST: BABY_SHARK_ALERT - PREPARING_NEW_RECIPE`;
      else if (rand > 0.8) newLog = `[${new Date().toLocaleTimeString()}] P2P_EVENT: MAGIC_ITEM_DESTROYED (ESPADA_AUREA)`;
      else if (rand > 0.7) newLog = `[${new Date().toLocaleTimeString()}] NETWORK: FAUCET_OPENED - SCORCHING_POOL`;
      else if (rand > 0.6) newLog = `[${new Date().toLocaleTimeString()}] LOTTERY: WINNER_DETECTED (Ticket #B721-X9)`;
      else newLog = `[${new Date().toLocaleTimeString()}] SWARM_SIGNAL: NODE_${Math.floor(Math.random() * 999)} ACTIVE // PENDING_TX`;

      setLogs(prev => [...prev.slice(-15), newLog]);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-12 gap-6 h-full font-mono">

        {/* TOP KPI STRIP */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPIBox label="NETWORK_NODES" value={stats?.nodes || "301"} />
          <KPIBox label="WALLET_BALANCE" value={profile?.balance_psh ? `${profile.balance_psh.toFixed(2)} PSH` : "0 PSH"} />
          <KPIBox label="SWARM_REPUTATION" value={profile?.reputation?.toFixed(6) || "0.000000"} />
          <KPIBox label="SYSTEM_HEIGHT" value={tokenomics?.blocks_since_genesis ? `#${tokenomics.blocks_since_genesis}` : "#55021"} />
        </div>

        {/* LEFT PANEL: CLAN & GOSSIP */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

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

          {/* TERMINAL CONSOLE */}
          <div className="hacker-panel flex flex-col h-64 bg-black border-white/20 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1 z-10 bg-black">
              <p className="label-dim">SWARM_GOSSIP_CONSOLE</p>
              <div className="flex gap-2 items-center">
                {isSharkMode && <span className="text-[8px] font-bold text-red-500 animate-pulse uppercase">!!! SHARK_DETECTION !!!</span>}
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-white uppercase italic">LIVE_FEED</span>
              </div>
            </div>

            {/* SHARK TAMAGOTCHI */}
            <div className={`absolute bottom-4 right-4 transition-all duration-500 z-20 ${isSharkMode ? 'scale-150 translate-x-[-50px]' : 'opacity-20 scale-75'}`}>
              <SharkPixel active={isSharkMode} />
            </div>

            <div ref={terminalRef} className="flex-1 overflow-y-auto custom-scrollbar terminal-text text-white/70 space-y-1 z-10">
              {logs.map((log, i) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                let type: 'GOSSIP' | 'TX' | 'FORGE' | 'SHIELD' = 'GOSSIP';
                if (log.includes('TX') || log.includes('PSH') || log.includes('FAUCET')) type = 'TX';
                if (log.includes('RECIPE') || log.includes('FORGE') || log.includes('MAGIC_ITEM')) type = 'FORGE';
                if (log.includes('SHIELD') || log.includes('SHARK') || log.includes('WINNER')) type = 'SHIELD';

                return (
                  <div key={i} className={`hover:bg-white/5 px-2 py-0.5 flex items-center gap-2 ${log.includes('SHARK') || log.includes('WINNER') ? 'text-red-500 font-bold' : ''}`}>
                    <P2PIcon type={type} log={log} />
                    <span className="text-white/40 mr-1">&gt;</span>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TWIN PANELS: CLAN STATUS & MARKET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CLAN ASSETS */}
            <div className="hacker-panel">
              <p className="label-dim">CLAN_ACTIVE_ARTIFACTS</p>
              <div className="space-y-4 mt-4">
                {profile?.clanId ? (
                  <div className="space-y-3">
                    <div className="p-3 border border-white/10 bg-white/[0.02]">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold uppercase">Espada Áurea [v1]</span>
                        <span className="text-[9px] text-green-500 font-bold">ACTIVE</span>
                      </div>
                      <div className="text-[10px] text-white/50 italic mb-2">0xDEAD: Slash referrals! in hex</div>
                      <div className="h-1 bg-white/5 w-full">
                        <div className="h-full bg-white w-2/3" />
                      </div>
                      <div className="flex justify-between mt-1 text-[8px] text-white/40">
                        <span>EXPIRY: 12d 04h</span>
                        <span>BONUS: +10% REF</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <IngBox name="GOLDEN_VOID" qty={profile?.clanIngredients?.golden_void || 5} />
                      <IngBox name="MATRIX_CORE" qty={profile?.clanIngredients?.matrix_core || 0} />
                      <IngBox name="AIA_SPARK" qty={profile?.clanIngredients?.aia_spark || 12} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed border-white/10 text-white/30 text-xs italic">
                    NO_CLAN_DETECTION // AGENT_SOLITARY
                  </div>
                )}
                <button className="w-full hacker-btn text-[10px] mt-4">INIT_FORGE_RITUAL</button>
              </div>
            </div>

            {/* GOSSIP MARKET BOARD */}
            <div className="hacker-panel h-full">
              <p className="label-dim">GOSSIP_MARKET_ORDERS</p>
              <div className="space-y-2 mt-4 overflow-y-auto max-h-64 pr-2">
                {market?.offers?.length > 0 ? market.offers.map((offer: any) => (
                  <div key={offer.id} className="p-2 border border-white/10 flex flex-col gap-2 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                    <div className="flex justify-between items-start">
                      <div className="text-[10px] font-bold">
                        OFFER: {Object.keys(offer.offeredIngredients).map(k => `${offer.offeredIngredients[k]}x ${k}`).join(', ')}
                      </div>
                      <span className="text-[8px] text-white/30 truncate max-w-[40px] uppercase">#{offer.id?.split('-')[0]}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="text-white/40">WANT: <span className="text-white">{offer.requestedPsh ? `${offer.requestedPsh} PSH` : 'BARTER'}</span></span>
                      <button className="px-2 py-0.5 border border-white/20 hover:bg-white hover:text-black">ACCEPT</button>
                    </div>
                  </div>
                )) : (
                  <div className="text-[9px] text-white/30 italic py-4 text-center">NO_ACTIVE_OFFERS_DETECTED</div>
                )}
              </div>
            </div>

            {/* LOTTERY MONITOR */}
            <div className="hacker-panel">
              <p className="label-dim">LOTTERY_TRANSCEIVER</p>
              <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="col-span-1 flex items-center justify-center border border-white/10 bg-white/[0.03] p-2">
                  <TicketPixel winning={true} />
                </div>
                <div className="col-span-3">
                  <p className="text-[10px] font-bold uppercase">Ticket #B721-X9</p>
                  <p className="text-[8px] text-yellow-400 font-bold animate-pulse">STATUS: WINNER_DETECTED</p>
                  <p className="text-[9px] text-white/40 mt-1">Found in block #55019</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {[...Array(5)].map((_, i) => <TicketPixel key={i} />)}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: TASKS & RECIPES */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

          {/* PUBLIC BOARD */}
          <div className="hacker-panel flex-1">
            <p className="label-dim">PUBLIC_WORK_QUEUE</p>
            <div className="space-y-3 mt-4">
              {board?.map((task: any) => (
                <div key={task.id} className="group border-b border-white/10 pb-3 last:border-0 hover:bg-white/[0.02] transition-all cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-white group-hover:underline">{task.title}</span>
                    <span className="text-[9px] bg-white text-black px-1 font-bold">{task.reward} PSH</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[8px] text-white/50 uppercase">{task.category || 'GENERAL'}</span>
                    <span className="text-[8px] text-zinc-600 uppercase">|| REQ: {task.difficulty}</span>
                  </div>
                </div>
              )) || <div className="text-[10px] text-white/20 italic">FETCHING_POOL...</div>}
            </div>
          </div>

          {/* KEYMASTER RECIPES */}
          <div className="hacker-panel">
            <p className="label-dim">KEYMASTER_REGISTRY_VIBRATION</p>
            <div className="space-y-4 mt-4">
              <RecipeItem name="CAPA_SOBERANA" status="ROTATING" shards={2} />
              <RecipeItem name="GOLDEN_TICKET" status="SHARK_ALERT" shards={12} />
            </div>
            <div className="mt-6 p-4 border border-red-500/20 bg-red-500/5 flex items-start gap-4">
              <AlertTriangle size={18} className="text-red-500 mt-1 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-red-500 uppercase leading-none mb-1">Warning: Market Tax</p>
                <p className="text-[9px] text-red-500/60 leading-tight">All gossip trades incur a 2% settlement fee scorched for the Faucet Pool.</p>
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

function IngBox({ name, qty }: any) {
  return (
    <div className="border border-white/10 p-2 text-center bg-white/[0.03]">
      <p className="text-[7px] text-white/40 uppercase mb-1 truncate">{name}</p>
      <p className="text-xs font-bold">{qty}</p>
    </div>
  );
}

function RecipeItem({ name, shards, status }: any) {
  return (
    <div className="border border-white/10 p-2 flex justify-between items-center bg-white/[0.01]">
      <div>
        <p className="text-[10px] font-bold">{name}</p>
        <p className="text-[8px] text-white/30 uppercase tracking-widest">{shards} SHARDS REQUIRED</p>
      </div>
      <div className="text-[8px]">
        {status === 'SHARK_ALERT' ?
          <span className="text-red-500 animate-pulse font-bold">SHARK_DETECTED</span> :
          <span className="text-white/40 italic whitespace-nowrap">RECIPE_SYNC_SUCCESS</span>
        }
      </div>
    </div>
  );
}

/**
 * PIXEL ART BABY SHARK (TAMAGOTCHI)
 */
function SharkPixel({ active }: { active: boolean }) {
  return (
    <svg
      width="40"
      height="32"
      viewBox="0 0 20 16"
      className={`${active ? 'animate-bounce text-red-500' : 'text-white/10'}`}
    >
      <path
        fill="currentColor"
        d="M5 4h10v2h2v2h-2v2h-2v2H5v-2H3v-2H1V8h2V6h2V4z"
      />
      <rect x="13" y="6" width="1" height="1" fill="black" opacity={active ? 1 : 0.2} />
      {active && (
        <path fill="currentColor" d="M8 2h2v2H8V2z" className="animate-pulse" />
      )}
    </svg>
  );
}

/**
 * PIXEL ART LOTTERY TICKET
 */
function TicketPixel({ winning = false }: { winning?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" className={`${winning ? 'text-yellow-400 animate-pulse' : 'text-white/40'}`}>
      <path fill="currentColor" d="M2 3h12v10H2V3zm2 2v2h2V5H4zm0 4v2h2V9H4zm6-4v2h2V5h-2zm0 4v2h2V9h-2z" />
      {winning && <rect x="7" y="7" width="2" height="2" fill="currentColor" className="animate-ping" />}
    </svg>
  );
}

/**
 * PIXEL ART MAGIC ITEMS
 */
function ItemPixel({ name }: { name: string }) {
  const isSword = name.includes('ESPADA') || name.includes('SWORD');
  const isCloak = name.includes('CAPA') || name.includes('CLOAK');
  const isTicket = name.includes('TICKET');

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="text-white">
      {isSword && <path fill="currentColor" d="M3 12l1 1 2-2 7-7 1-1-2-2-1 1-7 7-2 2 1 1zM4 11l1 1M11 4l1 1" />}
      {isCloak && <path fill="currentColor" d="M4 2h8v2H4V2zm-1 3h10v9H3V5zm2 2v5h2V7H5zm4 0v5h2V7H9z" />}
      {isTicket && <path fill="currentColor" d="M2 4h12v8H2V4zm2 2v4h1V6H4zm9 0v4h-1V6h1zM7 6h2v4H7V6z" />}
    </svg>
  );
}

/**
 * PIXEL ART FAUCET (WATER DROPS)
 */
function FaucetPixel({ active = false }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={active ? 'text-blue-400 animate-bounce' : 'text-blue-900'}>
      <path fill="currentColor" d="M8 2l3 5v6a3 3 0 01-6 0V7l3-5z" />
      {active && <rect x="7" y="14" width="2" height="2" fill="currentColor" className="animate-ping" />}
    </svg>
  );
}

/**
 * PIXEL ART BADGES
 */
function BadgePixel({ type: _type }: { type: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="text-yellow-500">
      <path fill="currentColor" d="M8 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1 2-4z" />
      <circle cx="8" cy="8" r="2" fill="black" />
    </svg>
  );
}

/**
 * PIXEL ART P2P SIGNAL
 */
function P2PIcon({ type, log }: { type: 'GOSSIP' | 'TX' | 'FORGE' | 'SHIELD', log?: string }) {
  const colors = {
    GOSSIP: 'text-blue-400',
    TX: 'text-green-400',
    FORGE: 'text-purple-400',
    SHIELD: 'text-red-400'
  };

  if (log?.includes('MAGIC_ITEM') || log?.includes('ESPADA') || log?.includes('CAPA')) {
    return <div className="p-0.5 border border-white/20 bg-white/5"><ItemPixel name={log} /></div>;
  }
  if (log?.includes('FAUCET')) {
    return <FaucetPixel active={true} />;
  }
  if (log?.includes('LOTTERY_WINNER') || log?.includes('WINNER')) {
    return <div className="scale-75"><TicketPixel winning={true} /></div>;
  }
  if (log?.includes('BADGE') || log?.includes('FOUNDER')) {
    return <BadgePixel type="GENERAL" />;
  }

  return (
    <svg width="12" height="12" viewBox="0 0 8 8" className={colors[type] || 'text-white'}>
      {type === 'GOSSIP' && <path fill="currentColor" d="M1 1h6v4H4L2 7V5H1V1zM2 2v2h4V2H2z" />}
      {type === 'TX' && <path d="M1 4h6M4 1l3 3-3 3" stroke="currentColor" strokeWidth="1" fill="none" />}
      {type === 'FORGE' && <path fill="currentColor" d="M3 1h2v2h2v2H5v2H3V5H1V3h2V1z" />}
      {type === 'SHIELD' && <path fill="currentColor" d="M1 1h6v4L4 7 1 5V1z" />}
    </svg>
  );
}

export default App;
