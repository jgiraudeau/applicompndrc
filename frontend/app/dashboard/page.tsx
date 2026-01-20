"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    LayoutDashboard,
    ArrowLeft,
    BarChart3,
    FileText,
    History,
    GraduationCap,
    Clock,
    Tag,
    Share2,
    ExternalLink,
    Sparkles // Added Sparkles
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { Navbar } from "@/components/Navbar";

interface Activity {
    id: number;
    document_type: string;
    topic: string;
    timestamp: string;
}

interface PublishedQuiz {
    code: string;
    title: string;
    date: string;
}

interface Quota {
    plan: string;
    generation_count: number;
    max_generations: number;
    chat_count: number;
    max_chat: number;
    trial_days_remaining: number;
}

interface Stats {
    total_generated: number;
    by_type: Record<string, number>;
    by_block: Record<string, number>;
    recent: Activity[];
    published: PublishedQuiz[];
    quota: Quota;
}

const TYPE_LABELS: Record<string, string> = {
    "dossier_prof": "Dossier Professeur",
    "dossier_eleve": "Dossier Élève",
    "fiche_deroulement": "Fiche Déroulement",
    "evaluation": "Évaluation",
    "quiz": "Quiz / QCM",
    "planning_annuel": "Planning Annuel"
};

export default function DashboardPage() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user) {
            const user = session.user as any;
            console.log("🔒 CHECKING ACCESS:", {
                email: user.email,
                plan: user.plan_selection,
                stripeId: user.stripeCustomerId
            });

            // GATEKEEPER: Redirect to payment if Pro checked but not paid
            if (user.plan_selection === 'subscription' && !user.stripeCustomerId) {
                console.log("🔒 Paiement requis. Redirection vers Onboarding.");
                window.location.href = "/onboarding";
                return;
            }

            // Fetch stats WITH TOKEN
            const token = (session as any).accessToken || user.accessToken;
            setMounted(true);

            if (token) {
                fetch(`${API_BASE_URL}/api/dashboard/stats`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                })
                    .then(res => {
                        if (res.status === 401) throw new Error("Unauthorized");
                        return res.json();
                    })
                    .then(data => {
                        setStats(data);
                        setIsLoading(false);
                    })
                    .catch(err => {
                        console.error("Error fetching stats:", err);
                        // Fallback to empty stats to show UI
                        setStats({
                            total_generated: 0,
                            by_type: {},
                            by_block: {},
                            recent: [],
                            published: [],
                            quota: {
                                plan: "trial",
                                generation_count: 0,
                                max_generations: 5,
                                chat_count: 0,
                                max_chat: 15,
                                trial_days_remaining: 0
                            }
                        });
                        setIsLoading(false);
                    });
            } else {
                console.warn("No token found, stopping loader.");
                setStats({
                    total_generated: 0,
                    by_type: {},
                    by_block: {},
                    recent: [],
                    published: [],
                    quota: {
                        plan: "trial",
                        generation_count: 0,
                        max_generations: 5,
                        chat_count: 0,
                        max_chat: 15,
                        trial_days_remaining: 0
                    }
                });
                setIsLoading(false);
            }
        }
    }, [session]);

    // ...

    // Safety check BEFORE rendering content
    if (!stats) return (
        <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-4">
            <p className="text-xl font-bold text-red-500">Impossible de charger les statistiques.</p>
            <p className="bg-slate-100 p-4 rounded font-mono text-sm border border-slate-200">
                {errorMsg || "Aucune donnée reçue"}
                <br />
                <span className="text-xs text-slate-400 mt-2 block">API: {API_BASE_URL}</span>
            </p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
            <Button variant="outline" onClick={() => window.location.href = "/login"}>Se reconnecter</Button>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <Navbar />

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Subscription & Quota Section */}
                    {stats?.quota && (
                        <Card className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Sparkles className="w-32 h-32" />
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        {stats.quota.plan === 'subscription' ? 'Abonnement Pro' : 'Essai Gratuit'}
                                        {stats.quota.plan === 'subscription' && <span className="bg-purple-500 text-xs px-2 py-1 rounded-full">ACTIF</span>}
                                    </h2>
                                    <p className="text-slate-300 mt-1">
                                        {stats.quota.plan === 'subscription'
                                            ? "Vous profitez de toutes les fonctionnalités en illimité."
                                            : `Il vous reste ${stats.quota.trial_days_remaining} jours d'essai.`
                                        }
                                    </p>
                                </div>

                                {stats.quota.plan !== 'subscription' && (
                                    <div className="flex flex-col gap-4 min-w-[250px]">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span>Générations de cours</span>
                                                <span className="font-bold">{stats.quota.generation_count} / {stats.quota.max_generations}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${stats.quota.generation_count >= stats.quota.max_generations ? 'bg-red-500' : 'bg-blue-400'}`}
                                                    style={{ width: `${Math.min(100, (stats.quota.generation_count / stats.quota.max_generations) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span>Messages Chat IA</span>
                                                <span className="font-bold">{stats.quota.chat_count} / {stats.quota.max_chat}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${stats.quota.chat_count >= stats.quota.max_chat ? 'bg-red-500' : 'bg-green-400'}`}
                                                    style={{ width: `${Math.min(100, (stats.quota.chat_count / stats.quota.max_chat) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary" onClick={() => window.location.href = "/onboarding"} className="w-full mt-2">
                                            Passer en Pro & Illimité
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-6 flex items-center gap-4 bg-white">
                            <div className="bg-blue-50 p-3 rounded-full">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Documents générés</p>
                                <p className="text-3xl font-bold text-slate-800">{stats?.total_generated || 0}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 bg-white">
                            <div className="bg-green-50 p-3 rounded-full">
                                <BarChart3 className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Types différents</p>
                                <p className="text-3xl font-bold text-slate-800">{Object.keys(stats?.by_type || {}).length}</p>
                            </div>
                        </Card>

                        <Card className="p-6 flex items-center gap-4 bg-white">
                            <div className="bg-purple-50 p-3 rounded-full">
                                <Tag className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Blocs travaillés</p>
                                <p className="text-3xl font-bold text-slate-800">{Object.keys(stats?.by_block || {}).length}</p>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* By Type Breakdown */}
                        <Card className="p-6 bg-white">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-slate-400" />
                                Répartition par type
                            </h2>
                            <div className="space-y-4">
                                {Object.entries(stats?.by_type || {}).map(([type, count]) => (
                                    <div key={type}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600">{TYPE_LABELS[type] || type}</span>
                                            <span className="font-semibold">{count}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{ width: `${(count / (stats?.total_generated || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(stats?.by_type || {}).length === 0 && (
                                    <p className="text-slate-400 text-sm italic">Aucune donnée disponible</p>
                                )}
                            </div>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="p-6 bg-white flex flex-col">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-400" />
                                Activité récente
                            </h2>
                            <ScrollArea className="flex-1 max-h-[300px]">
                                <div className="space-y-3">
                                    {stats?.recent?.map((activity) => (
                                        <div key={activity.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                                                    {TYPE_LABELS[activity.document_type] || activity.document_type}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {activity.timestamp}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 truncate">{activity.topic}</p>
                                        </div>
                                    ))}
                                    {(stats?.recent?.length === 0 || !stats?.recent) && (
                                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                            <History className="w-8 h-8 mb-2 opacity-20" />
                                            <p className="text-sm">Aucune activité enregistrée</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Published Quizzes Section */}
                    <Card className="p-6 bg-white overflow-hidden">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-indigo-500" />
                            Quizzes publiés (Espace Élève)
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Code</th>
                                        <th className="px-4 py-3">Titre</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 rounded-r-lg">Lien</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(stats?.published || []).map((q) => (
                                        <tr key={q.code} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-mono font-bold text-indigo-600">{q.code}</td>
                                            <td className="px-4 py-3 text-slate-700 font-medium">{q.title}</td>
                                            <td className="px-4 py-3 text-slate-400">{q.date}</td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/eleve?code=${q.code}`}
                                                    className="text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-1"
                                                >
                                                    Accès <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {(stats?.published?.length === 0 || !stats?.published) && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                Aucun quiz publié pour le moment
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
