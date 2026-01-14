"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { API_BASE_URL } from "@/lib/api";
import { FileText, Users, ListChecks, ClipboardCheck, HelpCircle, Calendar, Trash2, ExternalLink, Download } from "lucide-react";
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
                                    {selectedDoc.google_doc_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(selectedDoc.google_doc_url, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-1" />
                                            Ouvrir Google Doc
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
        </div>
    );
}
