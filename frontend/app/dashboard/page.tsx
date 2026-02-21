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
    Sparkles,
    Target,
    Award,
    Briefcase
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
    "planning_annuel": "Planning Annuel",
    "jeu_de_role": "Fiche CCF E4",
    "jeu_de_role_evenement": "Jeu de Rôle Évènement",
    "sujet_e5b_wp": "Sujet E5B WordPress",
    "sujet_e5b_presta": "Sujet E5B PrestaShop"
};

const DEFAULT_STATS: Stats = {
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
};

export default function DashboardPage() {
    const { data: session }: any = useSession();
    const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
    const [isLoading, setIsLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (session?.user) {
            const user = session.user as any;

            if (user.plan_selection === 'subscription' && !user.stripeCustomerId) {
                window.location.href = "/onboarding";
                return;
            }

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
                    })
                    .catch(err => {
                        console.error("Error fetching stats:", err);
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            } else {
                setIsLoading(false);
            }
        } else if (session === null) {
            setIsLoading(false);
        }
    }, [session]);

    if (isLoading) {
        return (
            <div className="flex flex-col h-screen bg-[#F7F7F8]">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-slate-400 text-sm font-bold">Le magicien prépare votre espace...</p>
                    </div>
                </div>
            </div>
        );
    }

    const userName = session?.user?.name?.split(' ')[0] || "Prof";

    return (
        <div className="flex flex-col h-screen bg-[#F7F7F8]">
            <Navbar />

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-10">

                    {/* --- HEADER GAMIFIÉ --- */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="text-6xl filter drop-shadow-md">🧙‍♂️</div>
                            <div>
                                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                    Bonjour {userName} !
                                </h2>
                                <p className="text-slate-500 font-bold text-lg mt-1">Qu&apos;allons-nous créer de génial aujourd&apos;hui ?</p>
                            </div>
                        </div>

                        {/* Flammes & Stats XP */}
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2.5 rounded-2xl font-black border-b-[4px] border-orange-200">
                                <span className="text-xl">🔥</span>
                                <span className="tracking-wide">3 Jours</span>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-100 text-blue-500 px-4 py-2.5 rounded-2xl font-black border-b-[4px] border-blue-200">
                                <span className="text-yellow-500 text-xl">⚡</span>
                                <span className="tracking-wide">{(stats?.total_generated || 0) * 15 + 500} XP</span>
                            </div>
                        </div>
                    </div>

                    {/* --- ACTIONS PRINCIPALES (CARTES 3D DUOLINGO) --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Carte 1 : Cours */}
                        <Link href="/generate?type=dossier_prof" className="group outline-none">
                            <div className="relative h-full">
                                {/* Ombre / Base */}
                                <div className="absolute inset-0 bg-[#42a818] rounded-[2rem] translate-y-2"></div>
                                {/* Bouton principal */}
                                <div className="relative h-full bg-[#58cc02] border-2 border-[#45a300] rounded-[2rem] p-6 flex flex-col items-center text-center gap-4 transition-transform group-active:translate-y-2 group-hover:-translate-y-1">
                                    <div className="bg-white/20 p-4 rounded-full mb-2">
                                        <GraduationCap className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-white leading-tight">Créer un Cours complet</h3>
                                    <div className="mt-auto w-full bg-white text-[#58cc02] font-black py-3 px-4 rounded-xl uppercase tracking-widest text-sm shadow-sm">Commencer</div>
                                </div>
                            </div>
                        </Link>

                        {/* Carte 2 : Exercices/Quiz */}
                        <Link href="/generate?type=quiz" className="group outline-none">
                            <div className="relative h-full">
                                <div className="absolute inset-0 bg-[#168ed0] rounded-[2rem] translate-y-2"></div>
                                <div className="relative h-full bg-[#1cb0f6] border-2 border-[#1899d6] rounded-[2rem] p-6 flex flex-col items-center text-center gap-4 transition-transform group-active:translate-y-2 group-hover:-translate-y-1">
                                    <div className="bg-white/20 p-4 rounded-full mb-2">
                                        <Target className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-white leading-tight">Générer des Exercices</h3>
                                    <div className="mt-auto w-full bg-white text-[#1cb0f6] font-black py-3 px-4 rounded-xl uppercase tracking-widest text-sm shadow-sm">Commencer</div>
                                </div>
                            </div>
                        </Link>

                        {/* Carte 3 : Examen E5B */}
                        <Link href="/generate?type=sujet_e5b_wp" className="group outline-none">
                            <div className="relative h-full">
                                <div className="absolute inset-0 bg-[#a34aba] rounded-[2rem] translate-y-2"></div>
                                <div className="relative h-full bg-[#ce82ff] border-2 border-[#b961f6] rounded-[2rem] p-6 flex flex-col items-center text-center gap-4 transition-transform group-active:translate-y-2 group-hover:-translate-y-1">
                                    <div className="bg-white/20 p-4 rounded-full mb-2">
                                        <Award className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-white leading-tight">Sujet d&apos;Examen</h3>
                                    <div className="mt-auto w-full bg-white text-[#ce82ff] font-black py-3 px-4 rounded-xl uppercase tracking-widest text-sm shadow-sm">Commencer</div>
                                </div>
                            </div>
                        </Link>

                        {/* Carte 4 : Fiche E4 */}
                        <Link href="/generate?type=jeu_de_role" className="group outline-none">
                            <div className="relative h-full">
                                <div className="absolute inset-0 bg-[#cc6500] rounded-[2rem] translate-y-2"></div>
                                <div className="relative h-full bg-[#ff9600] border-2 border-[#e67e00] rounded-[2rem] p-6 flex flex-col items-center text-center gap-4 transition-transform group-active:translate-y-2 group-hover:-translate-y-1">
                                    <div className="bg-white/20 p-4 rounded-full mb-2">
                                        <Briefcase className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-white leading-tight">Paramétrer Fiche CCF</h3>
                                    <div className="mt-auto w-full bg-white text-[#ff9600] font-black py-3 px-4 rounded-xl uppercase tracking-widest text-sm shadow-sm">Commencer</div>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* --- STATISTIQUES & TABLEAUX CLASSIQUES --- */}
                    <div className="pt-6 border-t-4 border-slate-200 border-dashed">
                        {/* Subscription & Quota Section */}
                        {stats?.quota && (
                            <Card className="p-6 bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
                                        {stats.quota.plan === 'subscription' ? 'Abonnement Pro' : 'Votre Progression'}
                                        {stats.quota.plan === 'subscription' && <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-bold border-b-2 border-purple-200">ACTIF</span>}
                                    </h2>
                                    <p className="text-slate-500 font-bold mt-2">
                                        {stats.quota.plan === 'subscription'
                                            ? "Vous profitez de l'assistant en illimité ! Continuez sur cette lancée."
                                            : `Il vous reste ${stats.quota.trial_days_remaining} jours d'essai pour utiliser la magie de l'IA.`
                                        }
                                    </p>
                                </div>

                                {stats.quota.plan !== 'subscription' && (
                                    <div className="flex flex-col gap-4 min-w-[250px] bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                                        <div>
                                            <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                                                <span>Générations de cours</span>
                                                <span>{stats.quota.generation_count} / {stats.quota.max_generations}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full transition-all ${stats.quota.generation_count >= stats.quota.max_generations ? 'bg-red-400' : 'bg-blue-400'}`}
                                                    style={{ width: `${Math.min(100, (stats.quota.generation_count / stats.quota.max_generations) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                                                <span>Messages Chat IA</span>
                                                <span>{stats.quota.chat_count} / {stats.quota.max_chat}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full transition-all ${stats.quota.chat_count >= stats.quota.max_chat ? 'bg-red-400' : 'bg-[#58cc02]'}`}
                                                    style={{ width: `${Math.min(100, (stats.quota.chat_count / stats.quota.max_chat) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <Button onClick={() => window.location.href = "/onboarding"} className="w-full mt-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1">
                                            Passer en Illimité
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <Card className="p-6 flex items-center gap-4 bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm">
                                <div className="bg-blue-100 p-4 rounded-2xl">
                                    <FileText className="w-8 h-8 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Documents générés</p>
                                    <p className="text-4xl font-black text-slate-800 tracking-tight">{stats?.total_generated || 0}</p>
                                </div>
                            </Card>

                            <Card className="p-6 flex items-center gap-4 bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm">
                                <div className="bg-[#e6fbf2] p-4 rounded-2xl">
                                    <BarChart3 className="w-8 h-8 text-[#58cc02]" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Types différents</p>
                                    <p className="text-4xl font-black text-slate-800 tracking-tight">{Object.keys(stats?.by_type || {}).length}</p>
                                </div>
                            </Card>

                            <Card className="p-6 flex items-center gap-4 bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm">
                                <div className="bg-purple-100 p-4 rounded-2xl">
                                    <Tag className="w-8 h-8 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Blocs travaillés</p>
                                    <p className="text-4xl font-black text-slate-800 tracking-tight">{Object.keys(stats?.by_block || {}).length}</p>
                                </div>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* By Type Breakdown */}
                            <Card className="p-6 bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm">
                                <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="bg-amber-100 p-2 rounded-xl"><BarChart3 className="w-5 h-5 text-amber-500" /></div>
                                    Répartition par type
                                </h2>
                                <div className="space-y-5">
                                    {Object.entries(stats?.by_type || {}).map(([type, count]) => (
                                        <div key={type}>
                                            <div className="flex justify-between text-sm font-bold mb-2">
                                                <span className="text-slate-600">{TYPE_LABELS[type] || type}</span>
                                                <span className="text-slate-800">{count}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3">
                                                <div
                                                    className="bg-amber-400 h-3 rounded-full"
                                                    style={{ width: `${(count / (stats?.total_generated || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(stats?.by_type || {}).length === 0 && (
                                        <p className="text-slate-400 text-sm italic font-bold text-center py-4">Commencez à créer pour voir vos statistiques !</p>
                                    )}
                                </div>
                            </Card>

                            {/* Recent Activity */}
                            <Card className="p-6 bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm flex flex-col">
                                <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="bg-rose-100 p-2 rounded-xl"><History className="w-5 h-5 text-rose-500" /></div>
                                    Dernières créations
                                </h2>
                                <ScrollArea className="flex-1 max-h-[300px]">
                                    <div className="space-y-4 pr-4">
                                        {stats?.recent?.map((activity) => (
                                            <div key={activity.id} className="p-4 bg-[#f7f7f8] rounded-2xl border-2 border-slate-100 transition-colors hover:border-slate-300">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-black px-3 py-1 rounded-xl bg-white text-slate-600 shadow-sm border border-slate-200 uppercase tracking-widest">
                                                        {TYPE_LABELS[activity.document_type] || activity.document_type}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-white px-2 py-1 rounded-full">
                                                        <Clock className="w-3 h-3" />
                                                        {activity.timestamp}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 line-clamp-2">{activity.topic}</p>
                                            </div>
                                        ))}
                                        {(stats?.recent?.length === 0 || !stats?.recent) && (
                                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                                <History className="w-12 h-12 mb-4 opacity-20" />
                                                <p className="text-sm font-bold">Aucune activité enregistrée</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </Card>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
