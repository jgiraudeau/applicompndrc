# Feuille de Route - Professeur Virtuel (Gemini Native)

## Objectif Global
Développer un MVP (Produit Minimum Viable) opérationnel permettant aux enseignants d'interagir avec leurs cours via l'IA Gemini, sans complexité d'infrastructure inutile.

## Phase 1 : Fondations & Cerveau (MVP)
**Objectif :** Avoir une interface de chat qui répond intelligemment aux questions basées sur des documents Google Drive réels.

### Étape 1.1 : Initialisation du Projet
- [x] Initialisation du repository Git.
- [x] Setup du projet **Next.js** (App Router) + Tailwind CSS + Shadcn/ui.
- [x] Setup du projet **FastAPI** (Backend Python) pour l'orchestration IA.
- [ ] Configuration de l'authentification (NextAuth ou Supabase Auth).

### Étape 1.2 : "Le Cerveau" (Backend Python + Gemini)
- [ ] Création du Service Google Drive : Listing et téléchargement des fichiers.
- [ ] Création du Service Gemini :
    - [x] Fonction d'upload vers Gemini File API (via script test).
    - [ ] Création et gestion du **Context Cache**.
    - [ ] Logique de mise à jour du cache (TTL, invalidation).
- [x] Création de l'endpoint API `/chat` qui interroge Gemini (Basic Chat).

### Étape 1.3 : Interface Utilisateur (Frontend)
- [x] Création de la page de Chat (style ChatGPT/Gemini).
- [ ] Création de la page "Documents" pour voir l'état de la synchro Drive <-> Gemini.
- [ ] Intégration du flux de streaming pour la réponse IA.
- [ ] Intégration du flux de streaming pour la réponse IA.

### Étape 1.6 : Monétisation & Abonnements (SaaS)
- [ ] **Page de Pricing** : Intégrée au flux d'inscription.
- [ ] **Sélection du Plan** : Free, Pro, Enterprise.
- [ ] **Backend** : Stockage du `plan` choisi dans la table Organization.
## Phase 2 : Outils Pédagogiques (Création de contenu)
**Objectif :** Passer du "Chat" à la "Création".

- [ ] **Générateur de Cours** : Formulaire pour demander "Une séquence sur la Négociation" -> L'IA génère le plan et le contenu en Markdown.
- [ ] **Export PDF** : Transformer le cours généré en PDF propre pour les élèves.
- [ ] **Générateur de Quiz** : Création automatique de QCM à partir d'un chapitre du cours.

## Phase 3 : Données Élèves & Suivi
**Objectif :** Gérer la classe.

- [ ] Modèle de données Élève / Classe / Note (Supabase).
- [ ] Interface Prof : Tableau de bord de la classe.
- [ ] Interface Élève : Accès simplifié aux cours et au chatbot tuteur.

## Phase 4 : Fonctionnalités Avancées (Stages & CCF)
**Objectif :** Gestion administrative.

- [ ] Module de suivi de stage.
- [ ] Génération des livrets de stage.

## Recommandation Immédiate
Commencer par l'**Étape 1.1** et **1.2**.
C'est le cœur du réacteur. Tant que nous n'avons pas prouvé que Gemini "comprend" bien tes documents Drive via l'API, le reste (interface, auth) est secondaire.

**Ma suggestion pour démarrer maintenant :**
1.  Je crée la structure du projet (dossiers, fichiers de config).
2.  On développe un script Python simple (prototype) pour tester la connexion Drive -> Gemini Cache -> Question. Cela validera la faisabilité technique immédiatement.
## Phase 5 : Mise en ligne & Beta Test
Passage d'un environnement local à un environnement cloud pour tests réels.

### Objectifs
- Migration de SQLite vers **PostgreSQL (Supabase)**.
- Déploiement du Backend (FastAPI) sur **Railway**.
- Déploiement du Frontend (Next.js) sur **Vercel**.

### Changements Prévus
#### [MODIFY] [database.py](file:///Users/imac2jacques/Desktop/antigravity/profvirtuel/backend/app/database.py)
- Support de la variable d'environnement `DATABASE_URL`.
- Switch dynamique entre SQLite (local) et PostgreSQL (cloud).

#### [MODIFY] [main.py](file:///Users/imac2jacques/Desktop/antigravity/profvirtuel/backend/main.py)
- Configuration CORS pour autoriser l'URL de production.

---

## Verification Plan
### Automated Tests
- Vérification de la connexion à Supabase via un script de test local.
- Test des endpoints `/api/dashboard/stats` sur Railway après déploiement.
