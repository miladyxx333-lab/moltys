import { useState } from 'react';
import { FileText, Briefcase, Zap, Download, Upload, Cpu, Shield, MessageSquare, Plus } from 'lucide-react';

export default function MoltyDash() {
    const [activeTab, setActiveTab] = useState<'OFFICE' | 'OPS' | 'SETTINGS'>('OFFICE');
    const [isProcessing, setIsProcessing] = useState(false);

    // Mock Data for visualization
    const [documents] = useState([
        { id: 1, name: 'Q1_Financial_Summary.pdf', type: 'PDF', date: '2h ago', status: 'READY' },
        { id: 2, name: 'Client_Data_Export.xml', type: 'XML', date: '5h ago', status: 'READY' },
        { id: 3, name: 'Meeting_Notes_Draft.docx', type: 'DOCX', date: '1d ago', status: 'READY' },
    ]);

    const handleGenerateMock = () => {
        setIsProcessing(true);
        setTimeout(() => setIsProcessing(false), 2000);
    };

    return (
        <div className="w-full max-w-4xl mx-auto h-[600px] bg-[#0a0f14] border border-white/5 rounded-xl overflow-hidden shadow-2xl flex relative font-sans text-slate-300">

            {/* Sidebar Navigation */}
            <div className="w-20 bg-black/40 border-r border-white/5 flex flex-col items-center py-6 gap-6 z-10 backdrop-blur-md">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    <span className="font-bold text-white text-xl">M</span>
                </div>

                <div className="flex flex-col gap-4 mt-8 w-full">
                    <NavBtn icon={Briefcase} active={activeTab === 'OFFICE'} onClick={() => setActiveTab('OFFICE')} label="OFFICE" />
                    <NavBtn icon={Zap} active={activeTab === 'OPS'} onClick={() => setActiveTab('OPS')} label="FIELD OPS" />
                    <NavBtn icon={Shield} active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} label="SYSTEM" />
                </div>

                <div className="mt-auto flex flex-col gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mx-auto" title="System Online" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0f1720] to-[#05080a] relative">
                {/* Background Grid Decoration */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                {/* Top Bar */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/[0.01] backdrop-blur-sm z-10">
                    <div>
                        <h2 className="text-white font-medium tracking-wide">MOLTY™ <span className="text-white/30 font-light">PRO UNIT</span></h2>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest">
                            <span>ID: 0x88...F7A</span>
                            <span>•</span>
                            <span className="text-green-400">Subscription Active</span>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-300 text-xs hover:bg-indigo-600/30 transition-all">
                        <Cpu size={14} />
                        <span>120 Tokens Available</span>
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 p-8 overflow-y-auto z-10">

                    {activeTab === 'OFFICE' && (
                        <div className="space-y-8">
                            {/* Hero Section */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <h1 className="text-2xl text-white font-light mb-1">Office Assistant</h1>
                                    <p className="text-white/40 text-sm">Automate documentation, conversion, and administrative tasks.</p>
                                </div>
                                <div className="flex gap-3">
                                    <ActionButton icon={Upload} label="Upload Context" />
                                    <ActionButton icon={Plus} label="New Task" primary />
                                </div>
                            </div>

                            {/* Task Input */}
                            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-1 flex items-center shadow-lg focus-within:border-indigo-500/50 transition-colors">
                                <div className="p-3 text-white/30">
                                    <MessageSquare size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ask Molty to draft a contract, verify an invoice, or summarize a PDF..."
                                    className="bg-transparent w-full text-sm text-white placeholder:text-white/20 focus:outline-none h-10"
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateMock()}
                                />
                                <button
                                    onClick={handleGenerateMock}
                                    className={`m-1 px-4 py-2 bg-indigo-600 rounded-lg text-white text-xs font-semibold hover:bg-indigo-500 transition-all ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    {isProcessing ? 'PROCESSING...' : 'EXECUTE'}
                                </button>
                            </div>

                            {/* Recent Documents */}
                            <div>
                                <h3 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Recent Output</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {documents.map(doc => (
                                        <div key={doc.id} className="group p-4 bg-white/[0.02] border border-white/5 rounded-lg hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-white/10 p-1.5 rounded-md hover:bg-white/20">
                                                    <Download size={14} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                                                    <FileText size={20} className="text-blue-400" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-white/50">{doc.type}</div>
                                                    <div className="text-xs text-white/30">{doc.date}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-white/80 font-medium truncate">{doc.name}</div>
                                        </div>
                                    ))}

                                    {/* Placeholder for Processing */}
                                    {isProcessing && (
                                        <div className="p-4 border border-indigo-500/30 bg-indigo-500/5 rounded-lg flex flex-col items-center justify-center gap-2 animate-pulse">
                                            <Cpu size={24} className="text-indigo-400 animate-spin-slow" />
                                            <span className="text-xs text-indigo-300">MOLTY IS TYPING...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'OPS' && (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                            <Zap size={48} className="text-white/20 mb-4" />
                            <h3 className="text-lg text-white font-medium">Field Operations</h3>
                            <p className="text-sm text-white/40 max-w-xs mt-2">
                                Molty can perform autonomous internet tasks, social farming, and bounties.
                            </p>
                            <button className="mt-6 px-6 py-2 border border-white/10 rounded-full text-xs text-white hover:bg-white/5 transition-all">
                                CONFIGURE WORKER
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

function NavBtn({ icon: Icon, active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex flex-col items-center gap-1 py-2 relative group transition-all ${active ? 'text-indigo-400' : 'text-white/20 hover:text-white/60'}`}
        >
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-indigo-500 rounded-r-full transition-all duration-300 ${active ? 'opacity-100' : 'opacity-0'}`} />
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-wider">{label}</span>
        </button>
    );
}

function ActionButton({ icon: Icon, label, primary }: any) {
    return (
        <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${primary
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
            }`}>
            <Icon size={14} />
            <span>{label}</span>
        </button>
    );
}
