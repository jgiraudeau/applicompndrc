"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Removed Textarea import as component is missing
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { useSession } from "next-auth/react";

export default function SaisieFichePage() {
    const { data: session } = useSession();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) return;
        setIsSaving(true);
        try {
            const token = (session as any)?.accessToken;
            const res = await fetch(`${API_BASE_URL}/api/documents/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    document_type: "student_fiche"
                })
            });

            if (res.ok) {
                setIsSuccess(true);
                setTitle("");
                setContent("");
                setTimeout(() => setIsSuccess(false), 3000);
            } else {
                alert("Erreur lors de la sauvegarde.");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/eleve" className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">Saisie de Fiche E4</h1>
                </div>

                <Card className="p-6 space-y-4 shadow-sm">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Titre de la fiche / situation</label>
                        <Input
                            placeholder="Ex: Négociation difficile avec Mr Martin"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contenu / Contexte détaillé</label>
                        <textarea
                            placeholder="Décrivez ici le contexte de l'entreprise, le client, la situation de départ, les objectifs..."
                            className="min-h-[200px] w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                            value={content}
                            onChange={(e: any) => setContent(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">Ce contenu sera utilisé pour générer les sujets d'examen.</p>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !title || !content}
                            className="bg-indigo-600 hover:bg-indigo-700 md:w-auto w-full"
                        >
                            {isSaving ? "Enregistrement..." : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Enregistrer la fiche
                                </>
                            )}
                        </Button>
                    </div>
                </Card>

                {isSuccess && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 border border-green-200 animate-in slide-in-from-bottom-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <p className="font-medium">Fiche enregistrée avec succès ! Elle est maintenant disponible pour le professeur.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
