
import { useState } from "react";
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
    FolderOpen,
    Menu,
    X
} from "lucide-react";

export function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isActive = (path: string) => pathname === path;

    const navLinks = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord", color: "text-slate-600" },
        { href: "/chat", icon: MessageSquare, label: "Assistant Chat", color: "text-blue-600" },
        { href: "/generate", icon: Sparkles, label: "Générateur", color: "text-amber-600" },
        { href: "/documents", icon: FolderOpen, label: "Mes Sauvegardes", color: "text-indigo-600" },
    ];

    if ((session?.user as any)?.role?.toLowerCase() === 'admin') {
        navLinks.push({ href: "/admin", icon: ShieldAlert, label: "Administration", color: "text-purple-600" });
    }

    return (
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
            {/* Left: Logo & Mobile Toggle */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>

                <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="hidden md:block">
                        <h1 className="font-bold text-lg text-slate-800">Votre Assistant Professeur</h1>
                        <p className="text-xs text-slate-500">BTS NDRC • Assistant Pédagogique IA</p>
                    </div>
                </Link>
            </div>

            {/* Middle: Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
                {navLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                        <Button
                            variant={isActive(link.href) ? "secondary" : "ghost"}
                            className={`gap-2 ${isActive(link.href)
                                    ? link.color === "text-slate-600" ? "bg-slate-50 text-slate-600"
                                        : link.color === "text-blue-600" ? "bg-blue-50 text-blue-600"
                                            : link.color === "text-amber-600" ? "bg-amber-50 text-amber-600"
                                                : link.color === "text-indigo-600" ? "bg-indigo-50 text-indigo-600"
                                                    : link.color === "text-purple-600" ? "bg-purple-50 text-purple-600"
                                                        : "bg-slate-50 text-slate-600"
                                    : "text-slate-600"
                                }`}
                        >
                            <link.icon className="w-4 h-4" />
                            <span>{link.label}</span>
                        </Button>
                    </Link>
                ))}
            </nav>

            {/* Right: User Actions */}
            <div className="flex items-center gap-2">
                {session?.user?.name && (
                    <div className="hidden lg:flex items-center gap-2 mr-2 border-r pr-4">
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
                    title="Se déconnecter"
                >
                    <LogOut className="w-5 h-5" />
                </Button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-white border-b shadow-lg p-4 flex flex-col gap-2 md:hidden">
                    {session?.user?.name && (
                        <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-lg">
                            <div className="bg-white p-1.5 rounded-full shadow-sm">
                                <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-slate-700">{session.user.name}</p>
                                <p className="text-slate-400 text-xs">
                                    {(session.user as any)?.role?.toLowerCase() === 'admin' ? 'Administrateur' : 'Enseignant'}
                                </p>
                            </div>
                        </div>
                    )}

                    {navLinks.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                            <Button
                                variant={isActive(link.href) ? "secondary" : "ghost"}
                                className={`w-full justify-start gap-3 h-12 text-base ${isActive(link.href)
                                    ? link.color === "text-slate-600" ? "bg-slate-50 text-slate-600"
                                        : link.color === "text-blue-600" ? "bg-blue-50 text-blue-600"
                                            : link.color === "text-amber-600" ? "bg-amber-50 text-amber-600"
                                                : link.color === "text-indigo-600" ? "bg-indigo-50 text-indigo-600"
                                                    : link.color === "text-purple-600" ? "bg-purple-50 text-purple-600"
                                                        : "bg-slate-50 text-slate-600"
                                    : "text-slate-600"
                                    }`}
                            >
                                <link.icon className="w-5 h-5" />
                                {link.label}
                            </Button>
                        </Link>
                    ))}
                </div>
            )}
        </header>
    );
}
