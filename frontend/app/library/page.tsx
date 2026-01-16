"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { API_BASE_URL } from "@/lib/api";
import { FileText, Users, ListChecks, ClipboardCheck, HelpCircle, Calendar, Trash2, ExternalLink, Download, Share, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const DOCUMENT_ICONS: any = {
    "dossier_prof": FileText,
    "dossier_eleve": Users,
    "fiche_deroulement": ListChecks,
    "evaluation": ClipboardCheck,
    "quiz": HelpCircle,
    "planning_annuel": Calendar
};

export default function MyDocumentsPage() {
    const { data: session }: any = useSession();
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchDocuments = async () => {
        try {
            const token = (session as any)?.accessToken;
            const res = await fetch(`${API_BASE_URL}/api/library/list`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            } else {
                console.error("Failed to fetch documents");
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchDocuments();
        }
    }, [session]);

    const handleDelete = async (docId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
            return;
        }

        setDeleting(docId);
        try {
            const token = (session as any)?.accessToken;
            const res = await fetch(`${API_BASE_URL}/api/library/${docId}`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setDocuments(documents.filter(d => d.id !== docId));
                if (selectedDoc?.id === docId) {
                    setSelectedDoc(null);
                }
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Erreur technique");
        } finally {
            setDeleting(null);
        }
    };

    const [courses, setCourses] = useState<any[]>([]);
    const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
    const [contentToExport, setContentToExport] = useState<string>("");
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [exportLoading, setExportLoading] = useState(false);

    const fetchCourses = async () => {
        if (!(session as any)?.googleAccessToken) {
            alert("Veuillez vous reconnecter avec Google pour utiliser cette fonctionnalité.");
            return;
        }
        try {
            setExportLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/classroom/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: (session as any).googleAccessToken })
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
                if (data.length > 0) setSelectedCourseId(data[0].id);
                setIsClassroomModalOpen(true);
            } else {
                alert("Impossible de récupérer vos cours Google Classroom.");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique.");
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportToClassroom = async () => {
        if (!selectedCourseId) return;
        setExportLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/classroom/coursework`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: (session as any).googleAccessToken,
                    courseId: selectedCourseId,
                    title: selectedDoc?.title || "Document exporté",
                    description: selectedDoc?.content || ""
                })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Devoir créé avec succès ! Lien : ${data.url}`);
                setIsClassroomModalOpen(false);
            } else {
                alert("Erreur lors de la création du devoir.");
            }
        } catch (e) {
            alert("Erreur technique.");
        } finally {
            setExportLoading(false);
        }
    };

    const handleExport = async (format: "pdf" | "docx") => {
        if (!selectedDoc) return;

        try {
            const token = (session as any)?.accessToken;
            // Use existing export endpoints
            const res = await fetch(`${API_BASE_URL}/api/export/${format}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: selectedDoc.content,
                    filename: selectedDoc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selectedDoc.title}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Erreur lors de l'export");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600">Chargement...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <Navbar />

            <div className="flex-1 overflow-hidden flex">
                {/* Sidebar - Liste des documents */}
                <div className="w-80 border-r bg-white p-4 overflow-y-auto">
                    <h2 className="font-bold text-lg mb-4">📚 Mes Supports ({documents.length})</h2>

                    {documents.length === 0 ? (
                        <div className="text-center text-slate-400 mt-8">
                            <p>Aucun support enregistré</p>
                            <p className="text-sm mt-2">Vos supports générés apparaîtront ici</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map((doc) => {
                                const Icon = DOCUMENT_ICONS[doc.document_type] || FileText;
                                const isSelected = selectedDoc?.id === doc.id;

                                return (
                                    <Card
                                        key={doc.id}
                                        className={`p-3 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                            }`}
                                        onClick={() => setSelectedDoc(doc)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <Icon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm truncate">{doc.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Main - Aperçu du document */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedDoc ? (
                        <>
                            <div className="p-4 border-b bg-white flex justify-between items-center">
                                <div>
                                    <h1 className="text-xl font-bold">{selectedDoc.title}</h1>
                                    <p className="text-sm text-slate-500">
                                        Créé le {new Date(selectedDoc.created_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {(session as any)?.googleAccessToken && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                            onClick={() => fetchCourses()}
                                        >
                                            <Share className="w-4 h-4 mr-1" />
                                            Classroom
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleExport('pdf')}
                                    >
                                        <FileText className="w-4 h-4 mr-1" />
                                        PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => handleExport('docx')}
                                    >
                                        <FileText className="w-4 h-4 mr-1" />
                                        Word
                                    </Button>

                                    {selectedDoc.google_doc_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(selectedDoc.google_doc_url, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-1" />
                                            Google Doc
                                        </Button>
                                    )}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(selectedDoc.id)}
                                        disabled={deleting === selectedDoc.id}
                                    >
                                        {deleting === selectedDoc.id ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 mr-1" />
                                        )}
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            <div className="text-center">
                                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>Sélectionnez un document pour l'afficher</p>
                            </div>
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
                                Exporter le contenu
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
                                    <Button onClick={handleExportToClassroom} disabled={exportLoading}>
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
