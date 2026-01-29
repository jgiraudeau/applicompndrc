"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GraduationCap, Sparkles, ArrowLeft, Copy, Check, FileText, Users, ListChecks, ClipboardCheck, Download, FileDown, HelpCircle, Calendar, Share2, ExternalLink, Share, Loader2, LogOut, Save, Wand2, Globe, ShoppingCart } from "lucide-react";
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
    { id: "jeu_de_role", label: "Jeu de Rôle (E4 - Négociation)", icon: Users, color: "text-rose-600 bg-rose-50 border-rose-200" },
    { id: "jeu_de_role_evenement", label: "Jeu de Rôle (E4 - Évènement)", icon: Sparkles, color: "text-orange-600 bg-orange-50 border-orange-200" },
    { id: "sujet_e5b_wp", label: "Sujet E5B (WordPress)", icon: Globe, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
    { id: "sujet_e5b_presta", label: "Sujet E5B (PrestaShop)", icon: ShoppingCart, color: "text-pink-600 bg-pink-50 border-pink-200" },
];

const TRACKS_DATA: Record<string, { label: string; blocks: { id: string; label: string }[] }> = {
    NDRC: {
        label: "BTS NDRC",
        blocks: [
            { id: "Bloc 1", label: "Bloc 1 - Relation client et négociation-vente" },
            { id: "Bloc 2", label: "Bloc 2 - Relation client à distance et digitalisation" },
            { id: "Bloc 3", label: "Bloc 3 - Relation client et animation de réseaux" }
        ]
    },
    MCO: {
        label: "BTS MCO",
        blocks: [
            { id: "Bloc 1", label: "Bloc 1 - Développer la relation client et vente conseil" },
            { id: "Bloc 2", label: "Bloc 2 - Animer et dynamiser l'offre commerciale" },
            { id: "Bloc 3", label: "Bloc 3 - Assurer la gestion opérationnelle" },
            { id: "Bloc 4", label: "Bloc 4 - Manager l'équipe commerciale" }
        ]
    },
    GPME: {
        label: "BTS GPME",
        blocks: [
            { id: "Bloc 1", label: "Bloc 1 - Gérer la relation avec les clients et fournisseurs" },
            { id: "Bloc 2", label: "Bloc 2 - Participer à la gestion des risques" },
            { id: "Bloc 3", label: "Bloc 3 - Gérer le personnel et contribuer à la GRH" },
            { id: "Bloc 4", label: "Bloc 4 - Soutenir le fonctionnement et le développement" }
        ]
    },
    CEJM: {
        label: "CEJM (Tronc commun)",
        blocks: [
            { id: "Thème 1", label: "Thème 1 : L'intégration de l'entreprise dans son environnement" },
            { id: "Thème 2", label: "Thème 2 : La régulation de l'activité économique" },
            { id: "Thème 3", label: "Thème 3 : L'organisation de l'activité de l'entreprise" },
            { id: "Thème 4", label: "Thème 4 : L'impact du numérique sur la vie de l'entreprise" },
            { id: "Thème 5", label: "Thème 5 : Les mutations du travail" },
            { id: "Thème 6", label: "Thème 6 : Les choix stratégiques de l'entreprise" }
        ]
    }
};

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
    const [suggestedFilename, setSuggestedFilename] = useState<string | null>(null); // New state

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
    const [activeTab, setActiveTab] = useState<'setup' | 'result'>('setup'); // Mobile tab state

    useEffect(() => {
        setMounted(true);
    }, []);

    // Placeholder handlers if they were missing from the view (implied by usage in JSX)
    const handleRefine = async () => {
        if (!refineInstruction || !generatedContent) return;
        setIsRefining(true);
        try {
            const token = (session as any)?.accessToken;
            const response = await fetch(`${API_BASE_URL}/api/generate/refine`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_content: generatedContent,
                    instruction: refineInstruction,
                    track: currentTrack
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedContent(data.content);
                setRefineInstruction("");
                setShowRefineInput(false);
            } else {
                const err = await response.text();
                alert(`Erreur lors du raffinement : ${err}`);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur technique lors du raffinement.");
        }
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
                    refresh_token: (session as any).googleRefreshToken, // Pass refresh token
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
                // If error contains "refresh", prompt user to relogin
                if (err.includes("refresh") || err.includes("credentials")) {
                    alert("❌ Session Google expirée. Veuillez vous déconnecter et vous reconnecter à l'application.");
                } else {
                    alert("❌ Erreur lors de la création : " + err);
                }
                console.error("API Error:", err);
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
                body: JSON.stringify({
                    token: session.googleAccessToken,
                    refresh_token: (session as any).googleRefreshToken
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
                    alert(`Impossible de récupérer vos cours : ${err}`);
                }
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
                    refresh_token: (session as any).googleRefreshToken,
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
                    category: currentTrack,
                }),
            });

            if (!response.ok) throw new Error("Erreur lors de la génération");

            const data = await response.json();
            setGeneratedContent(data.content);
            setSuggestedFilename(data.filename || null); // Store filename
            setLogId(data.log_id);
            setShareCode(null);
            // Switch to result tab on mobile after generation
            setActiveTab('result');
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
                    filename: suggestedFilename
                        ? `${suggestedFilename}_${docType}`
                        : `${topic.slice(0, 30).replace(/\s+/g, '_')}_${docType}` // Fallback truncated to 30 chars
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
            // Use same filename logic for download attribute
            const safeName = suggestedFilename
                ? `${suggestedFilename}_${docType}`
                : `${topic.slice(0, 30).replace(/\s+/g, '_')}_${docType}`;

            a.download = `${safeName}_export.${extension}`;
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
            {/* Debug Bar Removed */}

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                {/* Mobile Tab Bar */}
                <div className="lg:hidden flex border-b bg-white shrink-0">
                    <button
                        className={`flex-1 p-3 text-sm font-medium border-b-2 ${activeTab === 'setup' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                        onClick={() => setActiveTab('setup')}
                    >
                        Paramétrage
                    </button>
                    <button
                        className={`flex-1 p-3 text-sm font-medium border-b-2 ${activeTab === 'result' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
                        onClick={() => setActiveTab('result')}
                    >
                        Résultat {generatedContent && '✨'}
                    </button>
                </div>

                {/* Left Panel - Form */}
                <div className={`w-full lg:w-1/3 border-r bg-white p-6 flex flex-col gap-4 overflow-y-auto ${activeTab === 'setup' ? 'block' : 'hidden lg:flex'}`}>

                    {/* Track Selector */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Filière / Matière</label>
                        <select
                            className="w-full border rounded-md p-2 text-sm font-medium bg-slate-50 border-slate-200 focus:ring-2 focus:ring-primary/20"
                            value={currentTrack}
                            onChange={(e) => {
                                setCurrentTrack(e.target.value);
                                setBlock(""); // Reset block when track changes
                            }}
                        >
                            {Object.entries(TRACKS_DATA).map(([key, data]) => (
                                <option key={key} value={key}>{data.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dynamic Block Selector */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                            {currentTrack === "CEJM" ? "Thème ciblé (optionnel)" : "Bloc de compétences (optionnel)"}
                        </label>
                        <select
                            className="w-full border rounded-md p-2 text-sm text-slate-600"
                            value={block}
                            onChange={(e) => setBlock(e.target.value)}
                        >
                            <option value="">-- {currentTrack === "CEJM" ? "Tous les thèmes" : "Tous les blocs"} --</option>
                            {TRACKS_DATA[currentTrack]?.blocks.map((b) => (
                                <option key={b.id} value={b.id}>{b.label}</option>
                            ))}
                        </select>
                    </div>

                    <hr className="my-1 border-slate-100" />

                    {/* Document Type Selector */}
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">Type de document</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                            {DOCUMENT_TYPES.filter(type => {
                                const isNDRCSpecific = ["jeu_de_role", "sujet_e5b_wp", "sujet_e5b_presta"].includes(type.id);
                                return currentTrack === "NDRC" || !isNDRCSpecific;
                            }).map((type) => {
                                const Icon = type.icon;
                                const isSelected = docType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setDocType(type.id)}
                                        className={`p-3 rounded-lg border text-left transition-all active:scale-95 touch-manipulation min-h-[80px] flex flex-col justify-between ${isSelected
                                            ? `${type.color} border-2`
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-1 ${isSelected ? "" : "text-slate-400"}`} />
                                        <div className={`text-xs font-medium leading-tight ${isSelected ? "" : "text-slate-600"}`}>
                                            {type.label}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <hr className="my-2" />

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                            {['jeu_de_role', 'sujet_e5b_wp', 'sujet_e5b_presta'].includes(docType) ? 'Contexte / Fiche de Situation *' : 'Thème du cours *'}
                        </label>
                        {['jeu_de_role', 'sujet_e5b_wp', 'sujet_e5b_presta'].includes(docType) ? (
                            <textarea
                                className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[150px]"
                                placeholder="Collez ici le contexte complet de l'entreprise, du client et de la situation..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />
                        ) : (
                            <Input
                                placeholder="Ex: La négociation commerciale en B2B"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                            />
                        )}
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

                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading || !topic.trim()}
                        className={`mt-4 w-full min-h-[48px] active:scale-95 transition-transform touch-manipulation ${selectedType.color.includes('blue') ? 'bg-blue-500 hover:bg-blue-600' :
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
                <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'result' ? 'block' : 'hidden lg:flex'}`}>
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
                                    onClick={() => setShowRefineInput(!showRefineInput)}
                                    className={`${showRefineInput ? 'bg-purple-100 ring-2 ring-purple-200' : 'bg-white'} text-purple-700 border-purple-200 hover:bg-purple-50 mr-2`}
                                >
                                    <Wand2 className="w-4 h-4 mr-1" />
                                    Affiner
                                </Button>

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
                        {showRefineInput && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2">
                                <h3 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                                    <Wand2 className="w-4 h-4" />
                                    Affiner le contenu avec l'IA
                                </h3>
                                <p className="text-xs text-purple-600 mb-3">
                                    Décrivez ce que vous souhaitez modifier, ajouter ou corriger. L'IA réécrira le document pour vous.
                                </p>
                                <textarea
                                    className="w-full p-3 border rounded-md text-sm mb-3 focus:ring-2 focus:ring-purple-200 outline-none text-slate-700"
                                    placeholder="Ex: Ajoute un exercice pratique pour des BTS de 1ère année sur la négociation..."
                                    rows={3}
                                    value={refineInstruction}
                                    onChange={(e) => setRefineInstruction(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setShowRefineInput(false)}>Annuler</Button>
                                    <Button
                                        size="sm"
                                        onClick={handleRefine}
                                        disabled={isRefining || !refineInstruction.trim()}
                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        {isRefining ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2" />}
                                        Appliquer les changements
                                    </Button>
                                </div>
                            </div>
                        )}

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
