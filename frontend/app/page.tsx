import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Sparkles, GraduationCap, BarChart3, ArrowRight } from "lucide-react"

import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]/route"

export default async function LandingPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Votre Assistant Professeur
                </div>
                <div className="gap-4 flex">
                    {session ? (
                        <Link href="/dashboard">
                            <Button>Tableau de Bord</Button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/login">
                                <Button variant="ghost">Connexion</Button>
                            </Link>
                            <Link href="/register">
                                <Button>Essai Gratuit</Button>
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative px-6 pt-14 lg:px-8">
                <div className="mx-auto max-w-3xl py-12 sm:py-20 text-center">
                    <div className="hidden sm:mb-8 sm:flex sm:justify-center">
                        <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                            Nouveau : Génération de quiz automatique <span className="text-indigo-600 font-semibold">Voir les nouveautés &rarr;</span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 pb-2">
                        Votre assistant pédagogique intelligent pour le BTS NDRC
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        Gagnez du temps sur la préparation de vos cours et concentrez-vous sur ce qui compte vraiment : vos étudiants.
                        Profitez d'une IA spécialisée pour créer des ressources pédagogiques en quelques secondes.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        {session ? (
                            <Link href="/generate">
                                <Button size="lg" className="h-12 px-8 text-lg shadow-lg hover:shadow-xl transition-all">
                                    Générer un cours
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/register">
                                <Button size="lg" className="h-12 px-8 text-lg shadow-lg hover:shadow-xl transition-all">
                                    Commencer l'essai de 15 jours
                                </Button>
                            </Link>
                        )}

                        {!session && (
                            <Link href="/login">
                                <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
                                    Démo en direct
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="bg-slate-50 py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-base font-semibold leading-7 text-indigo-600">Gain de productivité</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Tout ce dont vous avez besoin pour enseigner
                        </p>
                        <p className="mt-6 text-lg leading-8 text-gray-600">
                            Une suite d'outils conçue par des enseignants, pour des enseignants.
                        </p>
                    </div>
                    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-3">
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <Sparkles className="h-10 w-10 text-indigo-600 mb-4" />
                                    <CardTitle>Génération de Contenu</CardTitle>
                                </CardHeader>
                                <CardContent className="text-gray-600">
                                    Créez des séquences de cours, des études de cas et des exercices corrigés en un clic grâce à notre IA entraînée sur le référentiel.
                                </CardContent>
                            </Card>
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <GraduationCap className="h-10 w-10 text-indigo-600 mb-4" />
                                    <CardTitle>Suivi des Compétences</CardTitle>
                                </CardHeader>
                                <CardContent className="text-gray-600">
                                    Évaluez la progression de vos étudiants sur les blocs de compétences clés. Tableaux de bord automatisés.
                                </CardContent>
                            </Card>
                            <Card className="border-none shadow-md">
                                <CardHeader>
                                    <BarChart3 className="h-10 w-10 text-indigo-600 mb-4" />
                                    <CardTitle>Analytique & Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="text-gray-600">
                                    Identifiez les décrocheurs et adaptez votre pédagogie grâce aux indicateurs de performance en temps réel.
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing CTA */}
            <section className="py-16 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-600 -skew-y-3 origin-bottom-left transform scale-110 z-0"></div>
                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        Prêt à moderniser votre enseignement ?
                    </h2>
                    <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-indigo-100">
                        Rejoignez les enseignants innovants qui utilisent Votre Assistant Professeur au quotidien.
                        Aucune carte bancaire requise pour l'essai.
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        {session ? (
                            <Link href="/dashboard">
                                <Button size="lg" variant="secondary" className="h-12 px-8 text-lg font-semibold group">
                                    Accéder au Tableau de Bord <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/register">
                                <Button size="lg" variant="secondary" className="h-12 px-8 text-lg font-semibold group">
                                    Démarrer mes 15 jours offerts <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 px-6 border-t">
                <div className="text-center text-gray-500 text-sm">
                    © 2026 Votre Assistant Professeur. Tous droits réservés.
                </div>
            </footer>
        </div>
    )
}
