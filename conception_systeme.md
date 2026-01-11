# Architecture du Professeur Virtuel - BTS NDRC

## 1. Résumé exécutif
La solution proposée est une application web éducative "Professeur Virtuel" conçue spécifiquement pour le BTS Négociation et Digitalisation de la Relation Client (NDRC). Elle agit comme un assistant pédagogique intelligent pour les formateurs et un tuteur personnalisé pour les étudiants. Le cœur du système repose sur **l'architecture native de Gemini 1.5**, exploitant sa fenêtre de contexte massive (Long Context) et le **Context Caching** pour ingérer et comprendre l'intégralité des cours et référentiels sans passer par une vectorisation complexe. L'application intègre la gestion complète du parcours : planification, différenciation pédagogique, suivi des stages et préparation aux examens (E4, E5, E6).

## 2. Modules principaux et fonctionnalités

### 2.1 Planification annuelle et Progression
- **Calendrier dynamique** : Génération automatique du planning annuel en fonction des heures référentiel (culture générale, CEJM, blocs pro).
- **Séquençage** : Découpage du programme en séquences et séances reliées aux compétences.

### 2.2 Création de Séquences et Séances
- **Assistant IA** : Génération de plans de cours et d'activités basés sur le référentiel.
- **Médiathèque** : Intégration de ressources (vidéos, PDF, quiz).

### 2.3 Moteur de Différenciation
- **Tests de positionnement** : Évaluation initiale des acquis.
- **Groupes de besoin** : Création automatique de groupes d'élèves par niveau.
- **Adaptation** : Proposition d'activités alternatives (remédiation ou approfondissement).

### 2.4 Parcours Individualisés
- **Dashboard élève** : Vue progression par compétence.
- **Recommandations** : Suggestions automatiques de ressources de révision.

### 2.5 Gestion des Stages
- **Suivi** : Tableau de bord des périodes de stage.
- **Documents** : Génération et signature électronique des conventions.
- **Livret de stage** : Remplissage numérique et validation tuteur.

### 2.6 Gestion du CCF (Contrôle en Cours de Formation)
- **Situations d'évaluation** : Planification des passages E4/E6.
- **Grilles numériques** : Remplissage des grilles officielles sur tablette/PC.
- **Coffre-fort numérique** : Stockage des preuves (fichiers, vidéos) pour le jury.

### 2.7 Préparation aux Examens
- **Banque de sujets** : Accès aux annales et sujets types.
- **Correction IA** : Pré-correction des devoirs écrits et feedback immédiat.

### 2.8 Support Pédagogique (Chatbot)
- **Tuteur 24/7** : Réponse aux questions des élèves sur le cours.
- **Coaching** : Aide à la méthodologie et à l'organisation.

### 2.9 Planification Année Académique
- **Vue globale** : Gestion des vacances, périodes d'examen, conseils de classe.

## 3. Architecture de l'Agent IA (Gemini Native)

Le système tire parti de la multimodalité et du volume de contexte de Gemini pour une compréhension globale des documents.

1.  **Ingestion & Caching (Google Drive -> Gemini)** :
    - Les documents (PDF, Docx, Vidéos) sont synchronisés depuis Google Drive.
    - Ils sont uploadés via l'API Gemini File API.
    - Création d'un **Context Cache** contenant les référentiels stables et les cours validés. Ce cache est "chauffé" et prêt à être interrogé, évitant de renvoyer les tokens à chaque requête.

2.  **Compréhension Multimodale** :
    - Contrairement au RAG classique qui découpe le texte, Gemini "voit" le document entier, incluant la mise en page, les graphiques et les tableaux, préservant ainsi la sémantique visuelle des supports de cours.

3.  **Traitement des requêtes** :
    - L'utilisateur pose une question.
    - Le système interroge Gemini en pointant vers le `cache_id` existant.
    - Gemini génère la réponse en ayant accès à l'intégralité du contexte pédagogique simultanément, permettant des synthèses transversales (liens entre chapitres).

## 4. Architecture technique

- **Frontend** : Next.js (React) pour le SSR et la performance. UI avec Tailwind CSS et Shadcn/ui.
- **Backend** : Python (FastAPI) pour la logique métier et l'orchestration des appels Gemini.
- **Base de données** : PostgreSQL (Supabase) pour les données relationnelles (utilisateurs, notes, planning).
- **IA Provider** : Google Gemini API (Flash/Pro) avec gestion du caching.
- **Stockage Fichiers** : Google Drive (via API) + Stockage temporaire pour upload.
- **Auth** : NextAuth.js (avec support Multi-Tenant).
- **Architecture SaaS** : Isolation logique des données par `organization_id`.

## 5. Rôles d'utilisateurs et permissions (SaaS)

### Niveau SaaS (Super Admin)
- **Super Admin** : Gestion de la plateforme, des abonnements (Stripe), et des tenants (Établissements).

### Niveau Établissement (Tenant)
- **Admin Établissement** : Directeur/Proviseur. Gère les abonnements de son école, ajoute les profs.
- **Formateur** : Création de cours, notation, suivi des élèves au sein de son établissement.
- **Élève** : Accès aux cours de son établissement uniquement.
- **Formateur référent** : Gestion des classes, validation des stages, paramétrage CCF.
- **Formateur** : Création de cours, notation, suivi des élèves.
- **Tuteur entreprise** : Accès limité au livret de stage et évaluation stagiaire.
- **Apprenant** : Accès aux cours, exercices, chatbot, suivi progression.

## 6. Moteur de différenciation et d'individualisation

Le moteur analyse les résultats aux quiz et devoirs pour attribuer un "Score de Maîtrise" par compétence.
- **Algorithme** : Si Score < 50% -> Parcours "Remédiation" (Ressources fondamentales, explication simplifiée). Si Score > 80% -> Parcours "Expert" (Cas complexes, approfondissement).
- **Feedback** : L'IA génère des feedbacks personnalisés sur les erreurs récurrentes.

## 7. Configuration et paramétrage

- **Multi-Etablissement** : Architecture multi-tenant (une base par école ou séparation logique).
- **Agnostique au programme** : Le "Référentiel" est une entité de données importable. On peut charger le JSON du BTS MCO, BTS GPME, etc.
- **Système d'évaluation** : Configurable (Notes /20, Compétences A/NA, Echelles descriptives).

## 8. Modèle de données (Simplifié - SaaS)

- `Organization` (Lycée Victor Hugo) -> Possède des `Users`, `Courses`, `Students`.
- `User` (Professeur) -> Lié à une `Organization`.
- `Program` (BTS NDRC) -> `Block` (E4) -> `Competence` (Négocier) -> `Criteria`.
- `Course` -> `Sequence` -> `Session` -> `Activity`.
- `User` (Student) -> `AssessmentResult` -> `SkillGap`.
- `Internship` -> `Company`, `Tutor`, `Mission`.

## 9. Points d'intégration

- **Google Drive** : Source primaire des fichiers.
- **Gemini Context Caching** : Mécanisme de synchronisation pour maintenir le "cerveau" de l'IA à jour avec les nouveaux fichiers du Drive sans ré-ingestion coûteuse à chaque appel.
- **LMS** : Export possible des notes vers Moodle ou Pronote (via API ou CSV).

## 10. Feuille de route de mise en œuvre

1.  **Phase 1 (MVP)** : Auth, Chatbot sur Context Cache, Création automatique de cours.
2.  **Phase 2 (Académique)** : Gestion des classes, Notes, CCF, Tableaux de bord.
3.  **Phase 3 (Différenciation)** : Moteur d'analyse, Parcours adaptatifs.
4.  **Phase 4 (Stages & Pro)** : Module entreprise, Signature électronique.

## 11. Évolutivité et transférabilité

L'application est conçue comme une "Coquille vide" pédagogique.
- **Transférabilité** : Pour passer au BTS MCO, il suffit de changer le set de documents dans le Cache Gemini et l'import du référentiel.
- **Scalabilité** : La fenêtre de contexte de 2M+ tokens permet d'absorber des cursus entiers. Gestion intelligente des caches (chargement dynamique par matière si besoin) pour optimiser les coûts.
