"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GraduationCap, Sparkles, ArrowLeft, Copy, Check, FileText, Users, ListChecks, ClipboardCheck, Download, FileDown, HelpCircle, Calendar, Share2, ExternalLink, Share, Loader2, LogOut, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { Navbar } from "@/components/Navbar";

const DOCUMENT_TYPES = [
    { id: "dossier_prof", label: "Dossier Professeur", icon: FileText, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: "dossier_eleve", label: "Dossier Élève", icon: Users, color: "text-green-600 bg-green-50 border-green-200" },
    { id: "fiche_deroulement", label: "Fiche Déroulement", icon: ListChecks, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: "evaluation", label: "Évaluation", icon: ClipboardCheck, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { id: "quiz", label: "Quiz / QCM", icon: HelpCircle, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { id: "planning_annuel", label: "Planning Annuel", icon: Calendar, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

export default function GeneratePage() {
    const [topic, setTopic] = useState("");
    const [duration, setDuration] = useState(4);
    const [block, setBlock] = useState("");
    const [docType, setDocType] = useState("dossier_prof");
    const [isLoading, setIsLoading] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [logId, setLogId] = useState<number | null>(null);
    const [shareCode, setShareCode] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Google Classroom State
    const { data: session }: any = useSession();
    const [courses, setCourses] = useState<any[]>([]);
    const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [exportLoading, setExportLoading] = useState(false);

    // Missing state variables added to fix stashed changes
    const [isRefining, setIsRefining] = useState(false);
    const [refineInstruction, setRefineInstruction] = useState("");
    const [showRefineInput, setShowRefineInput] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [currentTrack, setCurrentTrack] = useState("NDRC"); // Default track
    useEffect(() => {
        setMounted(true);
    }, []);

    // Placeholder handlers if they were missing from the view (implied by usage in JSX)
    const handleRefine = async () => {
        if (!refineInstruction || !generatedContent) return;
        setIsRefining(true);
        try {
            // Simple append for now, or a real refine endpoint if we had one. 
            // Re-using generation endpoint with a "refine" instruction effectively.
            const token = (session as any)?.accessToken;
            const response = await fetch(`${API_BASE_URL}/api/generate/course`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    topic: `${topic} (Refinement: ${refineInstruction})`,
                    duration_hours: duration,
                    document_type: docType,
                    category: currentTrack,
                    // In a real implementation we would send the previous content + instruction
                }),
            });
            if (response.ok) {
                const data = await response.json();
                setGeneratedContent(data.content);
                setRefineInstruction("");
                setShowRefineInput(false);
            }
        } catch (e) { console.error(e); }
        finally { setIsRefining(false); }
    };

    const handleSave = async () => {
        if (!generatedContent || !topic) return;
        setIsSaving(true);
        try {
            const token = (session as any)?.accessToken;
            if (!token) {
                alert("Vous devez être connecté pour sauvegarder.");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/documents/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: `${topic} (${selectedType.label})`,
                    content: generatedContent,
                    document_type: docType
                })
            });

            if (response.ok) {
                setIsSaved(true);
                // Reset "saved" status after 3 seconds
                setTimeout(() => setIsSaved(false), 3000);
            } else {
                const err = await response.text();
                console.error(err);
                alert("Erreur lors de la sauvegarde.");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique lors de la sauvegarde.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateAutoForm = async () => {
        if (!generatedContent) return;
        if (!session?.googleAccessToken) {
            alert("⚠️ Vous devez être connecté avec Google pour créer automatiquement un formulaire.\n(Déconnectez-vous et reconnectez-vous avec Google si nécessaire).");
            return;
        }

        if (!confirm("Cela va créer un nouveau formulaire dans votre Google Drive. Continuer ?")) return;

        setIsExporting("auto_form");
        try {
            const endpoint = `${API_BASE_URL}/api/google/forms/create`;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: session.googleAccessToken,
                    title: `${topic} - Quiz`,
                    content: generatedContent
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (confirm("✅ Formulaire créé avec succès !\nVoulez-vous l'ouvrir pour voir les questions ?")) {
                    window.open(data.edit_url, "_blank");
                }
            } else {
                const err = await response.text();
                console.error("API Error:", err);
                alert("❌ Erreur lors de la création : " + err);
            }
        } catch (e: any) {
            console.error(e);
            alert("❌ Erreur technique : " + e.message);
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
                body: JSON.stringify({ token: session.googleAccessToken })
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
                if (data.length > 0) setSelectedCourseId(data[0].id);
                setIsClassroomModalOpen(true);
            } else {
                const err = await res.text();
                alert(`Impossible de récupérer vos cours : ${err}`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Erreur technique : ${e.message}`);
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
                    token: session.googleAccessToken,
                    courseId: selectedCourseId,
                    title: `${topic} (${docType})`,
                    description: generatedContent
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

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setIsLoading(true);
        setGeneratedContent("");

        try {
            const token = (session as any)?.accessToken;
            const response = await fetch(`${API_BASE_URL}/api/generate/course`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    topic: topic,
                    duration_hours: duration,
                    target_block: block || null,
                    document_type: docType,
                }),
            });

            if (!response.ok) throw new Error("Erreur lors de la génération");

            const data = await response.json();
            setGeneratedContent(data.content);
            setLogId(data.log_id);
            setShareCode(null);
        } catch (error) {
            console.error(error);
            setGeneratedContent("❌ Une erreur est survenue lors de la génération.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePublish = async () => {
        if (!logId || !generatedContent) return;
        setIsPublishing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/student/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    log_id: logId,
                    content: generatedContent,
                    title: `${topic} (${docType})`
                }),
            });

            if (!response.ok) throw new Error("Erreur de publication");
            const data = await response.json();
            setShareCode(data.share_code);
        } catch (error) {
            console.error(error);
            alert("❌ Erreur lors de la publication.");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleExport = async (format: string) => {
        if (!generatedContent) return;
        setIsExporting(format);

        // Path logic: /api/export/pdf, /api/export/docx OR /api/export/quiz/gift, etc.
        const endpoint = ["pdf", "docx"].includes(format)
            ? `${API_BASE_URL}/api/export/${format}`
            : `${API_BASE_URL}/api/export/quiz/${format}`;

        try {
            const token = (session as any)?.accessToken;
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: generatedContent,
                    filename: `${topic.replace(/\s+/g, '_')}_${docType}`
                }),
            });

            if (!response.ok) throw new Error("Erreur lors de l'export");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Extension detection
            let extension = format;
            if (format === "gift") extension = "txt";
            if (format === "wooclap") extension = "xlsx";
            if (format === "google") extension = "csv";

            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `${topic.replace(/\s+/g, '_')}_${docType}_export.${extension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error(error);
            alert("❌ Erreur lors de l'export.");
        } finally {
            setIsExporting(null);
        }
    };

    const selectedType = DOCUMENT_TYPES.find(d => d.id === docType) || DOCUMENT_TYPES[0];

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <Navbar />
            {/* Debug Bar - Simplified */}
            <div className="bg-slate-100 text-[10px] text-slate-400 p-1 text-center">
                STATUS: {isLoading ? "Generating..." : "Idle"} | API: {API_BASE_URL}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex">
                {/* Left Panel - Form */}
                <div className="w-1/3 border-r bg-white p-6 flex flex-col gap-4 overflow-y-auto">
                    {/* Category Selector */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Matière / Bloc</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setCurrentTrack("NDRC")}
                                className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all ${currentTrack === "NDRC" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Blocs NDRC Spécialités
                            </button>
                            <button
                                onClick={() => setCurrentTrack("CEJM")}
                                className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-all ${currentTrack === "CEJM" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Bloc CEJM
                            </button>
                        </div>
                    </div>

                    <hr className="my-1" />

                    {/* Document Type Selector */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Type de document</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DOCUMENT_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isSelected = docType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setDocType(type.id)}
                                        className={`p-3 rounded-lg border text-left transition-all ${isSelected
                                            ? `${type.color} border-2`
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-1 ${isSelected ? "" : "text-slate-400"}`} />
                                        <div className={`text-xs font-medium ${isSelected ? "" : "text-slate-600"}`}>
                                            {type.label}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <hr className="my-2" />

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Thème du cours *</label>
                        <Input
                            placeholder="Ex: La négociation commerciale en B2B"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Durée (heures)</label>
                        <Input
                            type="number"
                            min={1}
                            max={500}
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                        />
                    </div>

                    {currentTrack === "NDRC" && (
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Bloc ciblé (optionnel)</label>
                            <select
                                className="w-full border rounded-md p-2 text-sm"
                                value={block}
                                onChange={(e) => setBlock(e.target.value)}
                            >
                                <option value="">-- Tous les blocs --</option>
                                <option value="Bloc 1">Bloc 1 - Relation client et négociation-vente</option>
                                <option value="Bloc 2">Bloc 2 - Relation client à distance et digitalisation</option>
                                <option value="Bloc 3">Bloc 3 - Relation client et animation de réseaux</option>
                            </select>
                        </div>
                    )}

                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading || !topic.trim()}
                        className={`mt-4 ${selectedType.color.includes('blue') ? 'bg-blue-500 hover:bg-blue-600' :
                            selectedType.color.includes('green') ? 'bg-green-500 hover:bg-green-600' :
                                selectedType.color.includes('purple') ? 'bg-purple-500 hover:bg-purple-600' :
                                    selectedType.color.includes('indigo') ? 'bg-indigo-500 hover:bg-indigo-600' :
                                        selectedType.color.includes('emerald') ? 'bg-emerald-500 hover:bg-emerald-600' :
                                            'bg-amber-500 hover:bg-amber-600'}`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Génération en cours...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Générer {selectedType.label}
                            </>
                        )}
                    </Button>
                </div>

                {/* Right Panel - Preview */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            {(() => {
                                const Icon = selectedType.icon;
                                return <Icon className={`w-5 h-5 ${selectedType.color.split(' ')[0]}`} />;
                            })()}
                            <h2 className="font-semibold text-slate-700">{selectedType.label}</h2>
                        </div>
                        {generatedContent && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport("pdf")}
                                    disabled={!!isExporting}
                                    className="text-red-600 border-red-100 hover:bg-red-50"
                                >
                                    {isExporting === "pdf" ? (
                                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1" />
                                    ) : (
                                        <FileDown className="w-4 h-4 mr-1" />
                                    )}
                                    PDF
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExport("docx")}
                                    disabled={!!isExporting}
                                    className="text-blue-600 border-blue-100 hover:bg-blue-50"
                                >
                                    {isExporting === "docx" ? (
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-1" />
                                    )}
                                    Word
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={isSaving || isSaved}
                                    className="text-slate-600 border-slate-200 hover:bg-slate-50"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mr-1" />
                                    ) : isSaved ? (
                                        <Check className="w-4 h-4 mr-1 text-green-600" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-1" />
                                    )}
                                    {isSaved ? "Sauvegardé" : "Sauvegarder"}
                                </Button>

                                {docType === "quiz" && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExport("gift")}
                                            disabled={!!isExporting}
                                            className="text-orange-600 border-orange-100 hover:bg-orange-50"
                                        >
                                            {isExporting === "gift" ? (
                                                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-1" />
                                            ) : null}
                                            Moodle (GIFT)
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleExport("wooclap")}
                                            disabled={!!isExporting}
                                            className="text-green-700 border-green-100 hover:bg-green-50"
                                        >
                                            {isExporting === "wooclap" ? (
                                                <div className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin mr-1" />
                                            ) : null}
                                            Wooclap (Excel)
                                        </Button>

                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handleCreateAutoForm}
                                            disabled={!!isExporting}
                                            className="bg-purple-700 hover:bg-purple-800 text-white border-none"
                                        >
                                            {isExporting === "auto_form" ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                            ) : (
                                                <ExternalLink className="w-4 h-4 mr-1" />
                                            )}
                                            ⚡ Créer Formulaire (Drive)
                                        </Button>

                                        {session?.googleAccessToken && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={fetchCourses}
                                                disabled={!!isExporting || exportLoading}
                                                className="text-emerald-700 border-emerald-100 hover:bg-emerald-50"
                                            >
                                                {exportLoading ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : <Share className="w-4 h-4 mr-2" />}
                                                Classroom
                                            </Button>
                                        )}

                                        {!shareCode ? (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handlePublish}
                                                disabled={isPublishing}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none gap-2"
                                            >
                                                {isPublishing ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                ) : <Share2 className="w-4 h-4" />}
                                                Publier pour les élèves
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md border border-indigo-100 text-sm font-medium">
                                                <span>Code : <span className="font-bold">{shareCode}</span></span>
                                                <ExternalLink className="w-4 h-4" />
                                            </div>
                                        )}
                                    </>
                                )}

                                <Button variant="outline" size="sm" onClick={handleCopy}>
                                    {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                                    {copied ? "Copié !" : "Copier"}
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {generatedContent ? (
                            <div className="prose prose-sm max-w-none pb-8">
                                <ReactMarkdown>{generatedContent}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <GraduationCap className="w-16 h-16 mb-4 opacity-30" />
                                <p>Sélectionnez un type de document et remplissez le formulaire</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Modal Google Classroom */}
            {
                isClassroomModalOpen && (
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
                                        <Button onClick={handleExportToClassroom} disabled={exportLoading} className="bg-green-600 hover:bg-green-700 text-white">
                                            {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Créer le devoir"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div >
    );
}
