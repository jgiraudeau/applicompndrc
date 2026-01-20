"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Sparkles,
    MessageSquare,
    LogOut,
    GraduationCap,
    User,
    ShieldAlert,
    FolderOpen
} from "lucide-react";

export function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <header className="bg-white border-b p-4 flex items-center gap-3 shadow-sm sticky top-0 z-50">
            {/* Logo Area */}
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="bg-primary/10 p-2 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div className="hidden md:block">
                    <h1 className="font-bold text-xl text-slate-800">Votre Assistant Professeur</h1>
                    <p className="text-xs text-slate-500">BTS NDRC • Assistant Pédagogique IA</p>
                </div>
            </Link>

            {/* Middle Navigation */}
            <nav className="flex items-center ml-auto gap-2 md:gap-4">
                <Link href="/dashboard">
                    <Button
                        variant={isActive("/dashboard") ? "secondary" : "ghost"}
                        className={`gap-2 ${isActive("/dashboard") ? "text-primary bg-primary/10" : "text-slate-600"}`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="hidden sm:inline">Tableau de bord</span>
                    </Button>
                </Link>

                <Link href="/chat">
                    <Button
                        variant={isActive("/chat") ? "secondary" : "ghost"}
                        className={`gap-2 ${isActive("/chat") ? "text-blue-600 bg-blue-50" : "text-slate-600"}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Assistant Chat</span>
                    </Button>
                </Link>

                <Link href="/generate">
                    <Button
                        variant={isActive("/generate") ? "secondary" : "ghost"}
                        className={`gap-2 ${isActive("/generate") ? "text-amber-600 bg-amber-50" : "text-slate-600"}`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Générateur</span>
                    </Button>
                </Link>

                <Link href="/documents">
                    <Button
                        variant={isActive("/documents") ? "secondary" : "ghost"}
                        className={`gap-2 ${isActive("/documents") ? "text-indigo-600 bg-indigo-50" : "text-slate-600"}`}
                    >
                        <FolderOpen className="w-4 h-4" />
                        <span className="hidden sm:inline">Mes Sauvegardes</span>
                    </Button>
                </Link>
                {(session?.user as any)?.role?.toLowerCase() === 'admin' && (
                    <Link href="/admin">
                        <Button
                            variant={isActive("/admin") ? "secondary" : "ghost"}
                            className={`gap-2 ${isActive("/admin") ? "text-purple-600 bg-purple-50" : "text-slate-600"}`}
                        >
                            <ShieldAlert className="w-4 h-4" />
                            <span className="hidden sm:inline">Administration</span>
                        </Button>
                    </Link>
                )}
            </nav>

            {/* User & Actions */}
            <div className="flex items-center gap-2 border-l pl-4 ml-2">
                {session?.user?.name && (
                    <div className="hidden lg:flex items-center gap-2 mr-2">
                        <div className="bg-slate-100 p-1.5 rounded-full">
                            <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="text-xs">
                            <p className="font-medium text-slate-700">{session.user.name}</p>
                            <p className="text-slate-400">
                                {(session.user as any)?.role?.toLowerCase() === 'admin' ? 'Administrateur' : 'Enseignant'}
                            </p>
                        </div>
                    </div>
                )}

                <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    title="Se déconnecter du compte"
                >
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>
        </header>
    );
}
