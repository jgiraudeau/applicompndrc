"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Copy, RefreshCw, Server, FileText, Database, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function RagDebugPage() {
    const { data: session, status } = useSession();
    const [debugData, setDebugData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);

    useEffect(() => {
        if (status === "authenticated" && (session?.user as any)?.role?.toLowerCase() === 'admin') {
            fetchDebugInfo();
        }
    }, [status, session]);

    const fetchDebugInfo = async () => {
        setIsLoading(true);
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/rag-debug`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setDebugData(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerScan = async () => {
        setScanLoading(true);
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
        try {
            await fetch(`${API_BASE_URL}/api/admin/scan`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await fetchDebugInfo();
        } catch (e) {
            alert("Scan failed");
        } finally {
            setScanLoading(false);
        }
    };

    if (status === "loading") return <div className="p-8">Chargement...</div>;

    if ((session?.user as any)?.role?.toLowerCase() !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="max-w-4xl mx-auto p-12 text-center text-red-500">
                    <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                    Accès réservé aux administrateurs.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-6xl mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Database className="w-8 h-8 text-purple-600" />
                            RAG Debugger (Gemini)
                        </h1>
                        <p className="text-slate-500">Inspectez l'état de la base de connaissances vectorielle</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchDebugInfo} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
                        </Button>
                        <Button onClick={triggerScan} disabled={scanLoading}>
                            <Server className="w-4 h-4 mr-2" />
                            {scanLoading ? 'Scan en cours...' : 'Forcer le Scan'}
                        </Button>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">

                    {/* Local State */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="font-semibold mb-4 flex items-center gap-2 text-slate-700">
                            <FileText className="w-5 h-5 text-indigo-500" />
                            Fichiers détectés localement ({debugData?.local_index_count || 0})
                        </h2>
                        <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-[400px]">
                            {debugData?.local_index ? (
                                Object.entries(debugData.local_index).map(([name, id]) => (
                                    <div key={name} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-700 font-bold">{name}</span>
                                        <span className="text-slate-400 truncate max-w-[150px]">{String(id)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 italic">Aucun fichier indexé localement.</p>
                            )}
                        </div>
                    </div>

                    {/* Remote State */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="font-semibold mb-4 flex items-center gap-2 text-slate-700">
                            <Server className="w-5 h-5 text-emerald-500" />
                            Fichiers sur Gemini Cloud ({debugData?.remote_file_count || 0})
                        </h2>
                        <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-[400px]">
                            {debugData?.remote_files && debugData.remote_files.length > 0 ? (
                                debugData.remote_files.map((f: any, i: number) => (
                                    <div key={i} className="mb-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 last:mb-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-700 block mb-1">{f.display_name}</span>
                                            {f.state === 'ACTIVE' ?
                                                <BadgeState color="emerald" text="Active" /> :
                                                <BadgeState color="amber" text={f.state} />
                                            }
                                        </div>
                                        <div className="text-slate-500 flex gap-2">
                                            <span>{f.mime_type}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="truncate max-w-[200px]" title={f.name}>{f.name}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    {debugData?.remote_files?.[0]?.error ? (
                                        <div className="text-red-500 flex flex-col items-center">
                                            <AlertTriangle className="w-8 h-8 mb-2" />
                                            <p>Erreur API Gemini</p>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 italic">Aucun fichier trouvé sur le Cloud Gemini.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

function BadgeState({ color, text }: { color: string, text: string }) {
    const map: any = {
        emerald: "bg-emerald-100 text-emerald-700",
        amber: "bg-amber-100 text-amber-700",
        red: "bg-red-100 text-red-700"
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${map[color] || map.amber}`}>
            {text}
        </span>
    );
}
