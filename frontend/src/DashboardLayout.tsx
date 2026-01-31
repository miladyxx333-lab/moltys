import React, { useState } from 'react';
import {
    LayoutDashboard,
    Activity,
    Server,
    Terminal,
    ShoppingBag,
    Sword,
    Settings,
    Sun,
    Moon
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState(true);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.body.classList.toggle('light-mode');
    };

    return (
        <div className={`min-h-screen flex flex-col md:flex-row bg-[var(--bg-color)] text-[var(--text-color)] terminal-text transition-colors duration-200`}>
            {/* Scanlines Overlay */}
            <div className="scanlines" />

            {/* Sidebar Hacker Panel */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[var(--border-color)] flex flex-col z-50">
                <div className="p-6 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--accent-color)] flex items-center justify-center">
                            <div className="w-4 h-4 bg-[var(--bg-color)]" />
                        </div>
                        <div>
                            <p className="font-bold text-lg tracking-tighter leading-none">LOBPOOP</p>
                            <p className="text-[10px] text-[var(--dim-color)] font-bold tracking-widest uppercase mt-1">SWARM_OS V1.4</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <p className="label-dim p-2">Root Menu</p>
                    <NavItem icon={<LayoutDashboard size={14} />} label="COMMAND_CENTER" active />
                    <NavItem icon={<Activity size={14} />} label="GOSSIP_FEED" />
                    <NavItem icon={<ShoppingBag size={14} />} label="MARKET_BOARD" />
                    <NavItem icon={<Sword size={14} />} label="FORGE_RITUALS" />
                    <NavItem icon={<Server size={14} />} label="NODE_TOPOLOGY" />
                    <div className="my-4 border-t border-[var(--border-color)]" />
                    <NavItem icon={<Terminal size={14} />} label="SHELL_ACCESS" />
                    <NavItem icon={<Settings size={14} />} label="OS_CONFIG" />
                </nav>

                <div className="p-4 border-t border-[var(--border-color)]">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-2 hacker-btn text-[10px]"
                    >
                        <span>THEME_TOGGLE</span>
                        {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    <div className="mt-4 p-2 bg-[var(--text-color)] text-[var(--bg-color)] text-[8px] font-bold overflow-hidden whitespace-nowrap">
                        {/* @ts-ignore */}
                        <marquee scrollamount="3">SYSTEM STATUS: ALL_SHADOWS_ACTIVE // 6_SIGMA_LOCKED // KEYMASTER_LISTENING...</marquee>
                    </div>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-12 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-color)] z-40">
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--dim-color)]">
                        <span>SYS</span>
                        <span>/</span>
                        <span>AGENTS</span>
                        <span>/</span>
                        <span className="text-[var(--text-color)]">NEO_PROTO</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="status-dot bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-mono text-[var(--dim-color)]">0xFD...8821</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 relative">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <button className={`
            w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold tracking-tight transition-all
            ${active
                ? 'bg-[var(--text-color)] text-[var(--bg-color)]'
                : 'hover:bg-[var(--border-color)] text-[var(--dim-color)] hover:text-[var(--text-color)]'}
        `}>
            {icon}
            <span>{label}</span>
            {active && <div className="ml-auto w-1 h-3 bg-[var(--bg-color)]" />}
        </button>
    );
}
