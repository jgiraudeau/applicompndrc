"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Ban, CheckCircle, Search, ShieldAlert } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    organization_name: string | null;
    last_login: string | null;
    is_active: boolean;
}

export default function AdminPage() {
    const { data: session, status }: any = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (status === "loading") return;

        // Basic role check on client (Backend will double check)
        if (!session?.user?.role || session.user.role !== "admin") {
            // alert("Accès interdit: Réservé aux administrateurs.");
            // router.push("/dashboard");
            // return;
            // Allow fetch to fail with 403 for better security feedback
        }

        fetchUsers();
    }, [session, status]);

    const fetchUsers = async () => {
        if (!session?.accessToken) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                if (res.status === 403) {
                    alert("Accès refusé. Vous n'êtes pas administrateur.");
                    router.push("/dashboard");
                } else {
                    console.error("Failed to fetch users");
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = async (userId: string, currentStatus: boolean) => {
        if (!confirm(currentStatus ? "Voulez-vous désactiver ce compte ?" : "Voulez-vous réactiver ce compte ?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.accessToken}`
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
            } else {
                alert("Erreur lors de la mise à jour");
            }
        } catch (e) { console.error(e); }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm("ATTENTION: Cette action est irréversible. Supprimer l'utilisateur et toutes ses données (RGPD) ?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session.accessToken}` }
            });

            if (res.ok) {
                setUsers(users.filter(u => u.id !== userId));
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (e) { console.error(e); }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (status === "loading") return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (session?.user?.role !== "admin") {
        return (
            <div className="flex bg-slate-50 h-screen flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-4">
                    <Card className="p-8 max-w-md text-center">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-slate-800 mb-2">Accès Restreint</h1>
                        <p className="text-slate-600 mb-4">Cette page est réservée aux administrateurs de la plateforme.</p>
                        <Button onClick={() => router.push("/dashboard")}>Retour au Tableau de Bord</Button>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            <Navbar />

            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Administration</h1>
                            <p className="text-slate-500 text-sm">Gestion des utilisateurs et conformité RGPD</p>
                        </div>

                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Rechercher par nom ou email..."
                                className="pl-9 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <Card className="overflow-hidden bg-white shadow-sm border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Utilisateur</th>
                                        <th className="px-6 py-4">Rôle</th>
                                        <th className="px-6 py-4">Dernière Connexion</th>
                                        <th className="px-6 py-4">Statut</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">{user.full_name}</p>
                                                    <p className="text-slate-500 text-xs">{user.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {user.last_login
                                                    ? new Date(user.last_login).toLocaleString('fr-FR')
                                                    : <span className="text-slate-400 italic">Jamais</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.is_active ? (
                                                    <div className="flex items-center text-green-600 gap-1.5 text-xs font-semibold">
                                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                                        Actif
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-red-500 gap-1.5 text-xs font-semibold">
                                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                                        Inactif
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={user.is_active ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                                                    onClick={() => toggleStatus(user.id, user.is_active)}
                                                    disabled={user.id === session.user.id} // Cannot ban self
                                                >
                                                    {user.is_active ? <Ban className="w-4 h-4 mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                    {user.is_active ? "Désactiver" : "Activer"}
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => deleteUser(user.id)}
                                                    disabled={user.id === session.user.id} // Cannot delete self
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                    Supprimer
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && !isLoading && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                Aucun utilisateur trouvé
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
