"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { API_BASE_URL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Calendar, Eye, Download, FolderOpen, FileDown, ExternalLink, Share, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function DocumentsPage() {
    const { data: session } = useSession();
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

    // Classroom State
    const [courses, setCourses] = useState<any[]>([]);
    const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        if (session) {
            fetchDocs();
        }
    }, [session]);

    const fetchDocs = async () => {
        const token = (session as any)?.accessToken;
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/documents/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDocs(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Supprimer ce document ?")) return;
        const token = (session as any)?.accessToken;
        await fetch(`${API_BASE_URL}/api/documents/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        fetchDocs();
        if (selectedDoc?.id === id) setSelectedDoc(null);
    };

    const [isExporting, setIsExporting] = useState<string | null>(null);

    const handleExport = async (format: string) => {
        if (!selectedDoc) return;
        setIsExporting(format);
        try {
            const token = (session as any).accessToken;
            // Determine endpoint based on type
            let endpoint = `${API_BASE_URL}/api/export/${format}`;
            if (selectedDoc.document_type === 'quiz') {
                // For quizzes, formats are specifically routed
                if (['gift', 'wooclap'].includes(format)) {
                    endpoint = `${API_BASE_URL}/api/export/quiz/${format}`;
                }
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: selectedDoc.content,
                    filename: selectedDoc.title
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Export failed");
            }

            const contentType = res.headers.get("Content-Type");
            if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                // Handle specific JSON responses if any
            } else {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                // Set extension
                let ext = format;
                if (format === 'gift') ext = 'txt';
                if (format === 'wooclap') ext = 'xlsx';

                a.download = `${selectedDoc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
                a.click();
            }

        } catch (e: any) {
            console.error(e);
            alert(`Erreur lors de l'export: ${e.message}`);
        } finally {
            setIsExporting(null);
        }
    };

    const handleCreateAutoForm = async () => {
        if (!selectedDoc) return;
        if (!confirm("Créer un Google Formulaire (Quiz) sur votre Drive ?")) return;

        setIsExporting("auto_form");
        try {
            const token = (session as any).accessToken; // Backend token
            const googleToken = (session as any)?.googleAccessToken;

            if (!googleToken) {
                alert("Vous devez être connecté avec Google pour utiliser cette fonction.");
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/google/forms/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: selectedDoc.title,
                    content: selectedDoc.content, // Corrected key
                    token: googleToken,           // Corrected key
                    refresh_token: (session as any)?.googleRefreshToken // Added refresh token
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.edit_url) {
                    if (confirm("Formulaire créé ! Ouvrir maintenant ?")) {
                        window.open(data.edit_url, "_blank");
                    }
                }
            } else {
                const err = await res.text();
                if (err.includes("credentials") || err.includes("refresh")) {
                    alert("❌ Session Google expirée. Veuillez vous déconnecter et vous reconnecter.");
                } else {
                    alert("Erreur API Google: " + err);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique creation form.");
        } finally {
            setIsExporting(null);
        }
    };

    const fetchCourses = async () => {
        if (!session?.googleAccessToken) {
            alert("Veuillez vous reconnecter avec Google pour utiliser cette fonctionnalité.");
            return;
        }
        try {
            setExportLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/classroom/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: (session as any)?.googleAccessToken,
                    refresh_token: (session as any)?.googleRefreshToken
                })
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
                if (data.length > 0) setSelectedCourseId(data[0].id);
                setIsClassroomModalOpen(true);
            } else {
                const err = await res.text();
                if (err.includes("credentials") || err.includes("refresh")) {
                    alert("❌ Session Google expirée. Veuillez vous déconnecter et vous reconnecter.");
                } else {
                    alert("Impossible de récupérer vos cours Google Classroom.");
                }
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique lors de la communication avec Google.");
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportToClassroom = async () => {
        if (!selectedCourseId || !selectedDoc) return;
        setExportLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/classroom/coursework`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: (session as any)?.googleAccessToken,
                    refresh_token: (session as any)?.googleRefreshToken,
                    courseId: selectedCourseId,
                    title: selectedDoc.title,
                    description: selectedDoc.content
                })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Devoir créé avec succès ! Lien : ${data.url}`);
                setIsClassroomModalOpen(false);
            } else {
                const err = await res.text();
                if (err.includes("credentials") || err.includes("refresh")) {
                    alert("❌ Session Google expirée. Veuillez vous déconnecter et vous reconnecter.");
                } else {
                    alert("Erreur lors de la création du devoir.");
                }
            }
        } catch (e) {
            alert("Erreur technique.");
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                {/* List */}
                <div className="w-1/3 border-r bg-white flex flex-col">
                    <div className="p-4 border-b bg-slate-50/50 flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-bold text-lg text-slate-700">Mes Sauvegardes</h2>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {loading ? (
                            <div className="p-4 text-center text-slate-400 text-sm">Chargement...</div>
                        ) : docs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <FileText className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-sm">Aucun document sauvegardé.</p>
                            </div>
                        ) : docs.map(doc => (
                            <Card
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${selectedDoc?.id === doc.id ? 'border-l-indigo-500 bg-indigo-50 border-t-slate-200 border-r-slate-200 border-b-slate-200' : 'border-l-transparent'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm text-slate-800 truncate">{doc.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 uppercase font-bold tracking-wider">{doc.document_type}</span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50 ml-2 shrink-0" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* View */}
                <div className="flex-1 bg-slate-50 p-6 overflow-y-auto">
                    {selectedDoc ? (
                        <Card className="max-w-4xl mx-auto p-8 min-h-[500px] bg-white shadow-sm ring-1 ring-slate-900/5">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b gap-4">
                                <h1 className="text-2xl font-bold text-slate-800">{selectedDoc.title}</h1>

                                <div className="flex flex-wrap gap-2">
                                    {/* Standard Exports */}
                                    <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={!!isExporting} title="Télécharger en PDF">
                                        {isExporting === 'pdf' ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <FileDown className="w-4 h-4 mr-2 text-red-600" />}
                                        PDF
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleExport("docx")} disabled={!!isExporting} title="Télécharger en Word">
                                        {isExporting === 'docx' ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <Download className="w-4 h-4 mr-2 text-blue-600" />}
                                        Word
                                    </Button>

                                    {/* Classroom for all */}
                                    {session?.googleAccessToken && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={fetchCourses}
                                            disabled={exportLoading || !!isExporting}
                                            title="Exporter vers Classroom"
                                            className="text-emerald-700 border-emerald-100 hover:bg-emerald-50"
                                        >
                                            {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share className="w-4 h-4 mr-2" />}
                                            Classroom
                                        </Button>
                                    )}

                                    {/* Quiz Specific Exports */}
                                    {selectedDoc.document_type === 'quiz' && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => handleExport("gift")} disabled={!!isExporting} title="Export Moodle">
                                                {isExporting === 'gift' ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <span className="mr-2 text-orange-600 font-bold">M</span>}
                                                Moodle
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleExport("wooclap")} disabled={!!isExporting} title="Export Wooclap">
                                                {isExporting === 'wooclap' ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <span className="mr-2 text-green-600 font-bold">W</span>}
                                                Wooclap
                                            </Button>
                                            <Button variant="default" size="sm" onClick={handleCreateAutoForm} disabled={!!isExporting} className="bg-purple-700 hover:bg-purple-800 text-white">
                                                {isExporting === 'auto_form' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                                                Drive Form
                                            </Button>
                                        </>
                                    )}

                                    <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(selectedDoc.content)}>
                                        Copier
                                    </Button>
                                </div>
                            </div>
                            <div className="prose prose-slate max-w-none">
                                <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                            </div>
                        </Card>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                <FileText className="w-8 h-8 opacity-30 text-indigo-500" />
                            </div>
                            <p>Sélectionnez un document pour le visualiser</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Google Classroom */}
            {isClassroomModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-white">
                        <div className="p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="text-green-600">Google Classroom</span>
                                Exporter
                            </h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Sélectionnez le cours dans lequel créer un devoir brouillon.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase text-gray-400 block mb-1">Cours</label>
                                    <select
                                        className="w-full border rounded p-2 text-sm"
                                        value={selectedCourseId}
                                        onChange={(e) => setSelectedCourseId(e.target.value)}
                                    >
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="ghost" onClick={() => setIsClassroomModalOpen(false)}>Annuler</Button>
                                    <Button onClick={handleExportToClassroom} disabled={exportLoading} className="bg-green-600 hover:bg-green-700 text-white">
                                        {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Créer le devoir"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
