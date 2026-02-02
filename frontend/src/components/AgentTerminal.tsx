import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../api';
import { Terminal as TerminalIcon, Play, RefreshCw, Trash2, Code, Maximize2, Minimize2 } from 'lucide-react';

export default function AgentTerminal() {
    const [history, setHistory] = useState<string[]>([
        "LOBPOOP AGENT RUNTIME ENVIRONMENT (A.R.E) v1.0",
        "Connected to Decentralized Kernel.",
        "Type your JavaScript strategy below...",
        "Examples: await Wallet.getBalance() or await Clan.list()"
    ]);
    const [code, setCode] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);

    // Auto-scroll output with improved behavior (only if near bottom)
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [history]);

    const executeCode = async () => {
        if (!code.trim()) return;
        setIsExecuting(true);

        // Add command to history (formatted)
        setHistory(prev => [...prev, `>_ AGENT::EXECUTE`]);

        try {
            const res = await apiFetch('/api/terminal/run', {
                method: 'POST',
                headers: {
                    'X-Genesis-Secret': localStorage.getItem('lob_genesis_secret') || ''
                },
                body: JSON.stringify({ code })
            });

            if (res.logs && Array.isArray(res.logs)) {
                setHistory(prev => [...prev, ...res.logs]);
            }
            if (res.result !== undefined) {
                setHistory(prev => [...prev, `[RETURN] ${JSON.stringify(res.result, null, 2)}`]);

                // Si el comando fue un éxito de autenticación, guardamos el secreto
                if (res.result && res.result.authorized) {
                    const match = code.match(/System\.auth\s*\(\s*['"](.*)['"]\s*\)/i);
                    if (match && match[1]) {
                        localStorage.setItem('lob_genesis_secret', match[1]);
                        // If role is KeyMaster, explicit set
                        if (res.result.role === 'KEYMASTER') {
                            localStorage.setItem('lob_node_id', 'lobpoop-keymaster-genesis');
                        }
                        setHistory(prev => [...prev, `[SYSTEM] Session upgraded. Credentials persisted.`]);
                    }
                }
            }
            if (res.gasUsed) {
                setHistory(prev => [...prev, `[METRICS] Gas Used: ${res.gasUsed}ms`]);
            }

        } catch (e: any) {
            setHistory(prev => [...prev, `[ERROR] ${e.message}`]);
        } finally {
            setIsExecuting(false);
            setHistory(prev => [...prev, '----------------------------------------']);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) {
            executeCode();
        }
    };

    return (
        <div className={`hacker-panel bg-black border-green-500/30 flex flex-col shadow-[0_0_20px_rgba(34,197,94,0.05)] transition-all duration-300 ${isFullscreen
            ? 'fixed inset-0 z-[9999] m-0 rounded-none'
            : 'h-full min-h-[400px]'
            }`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-2 px-1 border-b border-green-500/20 pb-2 bg-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <TerminalIcon size={14} className="text-green-500" />
                    <span className="label-dim text-green-500/80 font-bold tracking-widest text-[10px]">AGENT_TERMINAL_REPL</span>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="text-white/30 hover:text-green-400 transition-colors flex items-center gap-1"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        <span className="text-[10px] font-mono uppercase lg:block hidden">
                            {isFullscreen ? "[Exit_Full]" : "[Full_Screen]"}
                        </span>
                    </button>
                    <button
                        onClick={() => setHistory([])}
                        className="text-white/30 hover:text-red-400 transition-colors"
                        title="Clear Output"
                    >
                        <Trash2 size={12} />
                    </button>
                    <div className="bg-green-500/10 px-2 py-0.5 border border-green-500/20">
                        <span className="text-[8px] text-green-500 font-mono animate-pulse">● ONLINE</span>
                    </div>
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={outputRef}
                className="flex-1 bg-black/50 overflow-y-auto custom-scrollbar font-mono text-[10px] p-2 mb-2 border border-white/5 space-y-1"
                style={{ fontFamily: '"Fira Code", monospace' }}
            >
                {history.map((line, i) => (
                    <div key={i} className={`${line.startsWith('>') ? 'text-green-400 font-bold' : line.startsWith('[ERROR]') ? 'text-red-400' : line.startsWith('[RETURN]') ? 'text-blue-300' : 'text-white/60'} whitespace-pre-wrap break-all`}>
                        {line}
                    </div>
                ))}
                {isExecuting && (
                    <div className="text-green-500/50 animate-pulse">Running script...</div>
                )}
            </div>

            {/* Input Area */}
            <div className={`mt-auto relative group ${isFullscreen ? 'pb-4 px-2' : ''}`}>
                <div className="absolute top-2 left-2 pointer-events-none">
                    <Code size={12} className="text-green-500/50" />
                </div>
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="// Write your strategy here... (Cmd+Enter to run)"
                    className={`w-full bg-white/[0.03] border border-white/10 text-white/90 text-xs font-mono p-2 pl-7 focus:outline-none focus:border-green-500/50 focus:bg-white/[0.05] transition-all resize-none rounded-sm placeholder:text-white/20 ${isFullscreen ? 'h-32' : 'h-24'}`}
                    spellCheck={false}
                />
                <button
                    onClick={executeCode}
                    disabled={isExecuting}
                    className="absolute bottom-6 right-4 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 px-3 py-1 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExecuting ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} className="fill-current" />}
                    EXECUTE
                </button>
            </div>
        </div>
    );
}
