"use client";

import { useState, useEffect } from "react";
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
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

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

interface Stats {
    total_generated: number;
    by_type: Record<string, number>;
    by_block: Record<string, number>;
    recent: Activity[];
    published: PublishedQuiz[];
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
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        fetch(`${API_BASE_URL}/api/dashboard/stats`)
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching stats:", err);
                setIsLoading(false);
            });
    }, []);

    if (!mounted) return null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b p-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
                <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Link>
                <div className="bg-blue-100 p-2 rounded-lg">
                    <LayoutDashboard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="font-bold text-xl text-slate-800">Tableau de Bord</h1>
                    <p className="text-xs text-slate-500">Suivi d'activité et statistiques</p>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
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
