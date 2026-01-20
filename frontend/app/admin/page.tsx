"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Ban, CheckCircle, Search, ShieldAlert, XCircle, CheckCheck, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    last_login: string | null;
    is_active: boolean;
    status: string;         // 'pending', 'active', 'rejected'
    plan_selection: string; // 'trial', 'subscription'
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/dashboard");
        } else if (status === "authenticated") {
            if ((session?.user as any)?.role?.toLowerCase() !== 'admin') {
                // Wait a bit or redirect
            } else {
                fetchUsers();
            }
        }
    }, [status, session]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
            const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                console.error("Failed to fetch users", response.status);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScan = async () => {
        if (!confirm("Voulez-vous lancer la synchronisation de la base de connaissances avec l'IA ?\nCela permettra de mettre à jour les documents de référence.")) return;

        setIsLoading(true);
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/scan`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ Synchronisation réussie !\n${data.files_count} fichiers chargés.`);
            } else {
                const err = await response.text();
                alert(`Erreur: ${err}`);
            }
        } catch (error) {
            console.error("Scan error:", error);
            alert("Erreur de connexion au serveur.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (userId: string, updates: { is_active?: boolean, status?: string }) => {
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                fetchUsers();
            } else {
                alert("Erreur lors de la mise à jour");
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Attention: Cette action est irréversible (RGPD: Droit à l'oubli).\nVoulez-vous vraiment supprimer cet utilisateur et toutes ses données ?")) return;

        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setUsers(users.filter(u => u.id !== userId));
            }
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    // Filter users
    const filteredUsers = users.filter((user) =>
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const activeUsers = filteredUsers.filter((u) => u.status !== 'pending' && u.status !== 'rejected');
    const pendingUsers = filteredUsers.filter((u) => u.status === 'pending');

    if (status === "loading" || isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <p>Chargement...</p>
            </div>
        </div>;
    }

    if ((session?.user as any)?.role?.toLowerCase() !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50">
                <Navbar />
                <div className="max-w-4xl mx-auto p-12 text-center">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Accès Refusé</h1>
                    <p className="text-slate-500">Vous n'avez pas les droits d'administration nécessaires pour accéder à cette page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="max-w-6xl mx-auto p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Console d'Administration</h1>
                        <p className="text-slate-500">Gestion des utilisateurs, validation des inscriptions et conformité RGPD.</p>
                    </div>
                    <Button
                        onClick={handleScan}
                        variant="outline"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Synchroniser IA
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 px-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'users' ? 'text-purple-600 border-purple-600' : 'text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                    >
                        Utilisateurs Actifs
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`pb-3 px-4 font-medium text-sm transition-colors border-b-2 relative ${activeTab === 'requests' ? 'text-purple-600 border-purple-600' : 'text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                    >
                        Demandes d'inscription
                        {pendingUsers.length > 0 && (
                            <span className="absolute top-0 right-0 -mt-1 -mr-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                                {pendingUsers.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
                    <Search className="w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Rechercher par nom ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-none shadow-none focus-visible:ring-0 pl-0 text-base"
                    />
                </div>

                {/* Content Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                <TableHead className="py-4">Utilisateur</TableHead>
                                <TableHead className="py-4">Rôle</TableHead>
                                <TableHead className="py-4">Formule</TableHead>
                                <TableHead className="py-4">Statut</TableHead>
                                <TableHead className="py-4">Dernière activité</TableHead>
                                <TableHead className="text-right py-4">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(activeTab === 'users' ? activeUsers : pendingUsers).length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                        {activeTab === 'users' ? "Aucun utilisateur actif trouvé." : "Aucune demande en attente."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                (activeTab === 'users' ? activeUsers : pendingUsers).map((user) => (
                                    <TableRow key={user.id} className="group">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-900">{user.full_name}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${user.role?.toLowerCase() === 'admin'
                                                ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                : 'bg-slate-50 text-slate-600 border-slate-100'
                                                }`}>
                                                {user.role?.toLowerCase() === 'admin' ? 'Administrateur' : 'Enseignant'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600">
                                                {user.plan_selection === 'subscription' ? (
                                                    <span className="flex items-center gap-1.5 font-medium text-indigo-600">
                                                        <CheckCircle className="w-3 h-3" /> Abonnement
                                                    </span>
                                                ) : 'Test Gratuit'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {activeTab === 'requests' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                    En attente validation
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${user.is_active
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-red-50 text-red-700 border-red-100'
                                                    }`}>
                                                    {user.is_active ? 'Actif' : 'Désactivé'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                            {user.last_login ? new Date(user.last_login).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {activeTab === 'requests' ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 h-8"
                                                            onClick={() => handleStatusUpdate(user.id, { status: 'active' })}
                                                            title="Valider l'inscription"
                                                        >
                                                            <CheckCheck className="w-4 h-4 mr-1.5" />
                                                            Valider
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8"
                                                            onClick={() => handleStatusUpdate(user.id, { status: 'rejected' })}
                                                            title="Refuser la demande"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className={`h-8 w-8 p-0 ${user.is_active ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}`}
                                                            onClick={() => handleStatusUpdate(user.id, { is_active: !user.is_active })}
                                                            title={user.is_active ? "Désactiver le compte" : "Réactiver le compte"}
                                                        >
                                                            {user.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            title="Supprimer définitivement"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}
