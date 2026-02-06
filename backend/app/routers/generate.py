from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import ActivityLog
from ..services.gemini_service import gemini_service
# Lazy import: knowledge_base will be imported inside functions to avoid startup delays
from google import genai

router = APIRouter()

# Specialized prompt templates for each document type
PROMPT_TEMPLATES = {
    "dossier_prof": """Tu es un expert en création de cours pour le BTS {track}.
Génère un DOSSIER PROFESSEUR complet et structuré pour l'enseignant :

# Dossier Professeur : [Titre du Thème]

## 1. Présentation de la Séquence
- **Bloc de compétences visé** : [Nom du bloc]
- **Compétences à acquérir** : [Lister les compétences exactes du référentiel]
- **Critères de performance** : [Indicateurs de réussite]
- **Savoirs associés** : [Liste des savoirs théoriques]
- **Durée estimée** : [Heures]

## 2. Déroulement de la Séance (Conducteur)
| Phase | Durée | Activité Professeur | Activité Élève | Support |
| :--- | :---: | :--- | :--- | :--- |
| **Accroche** | 10' | ... | ... | Vidéo/Image |
| **Activité 1** | 45' | ... | ... | Dossier Élève |
| **Synthèse** | 15' | ... | ... | Tableau |

## 3. CORRIGÉ DÉTAILLÉ (ACTIVITÉS)

### Correction Activité 1 : [Titre]
*Fournir ici les réponses attendues de manière précise.*
1.  **Réponse Q1** : ...
    *   *Critère d'évaluation : ...*
2.  **Réponse Q2** : ...

### Correction Activité 2 : [Titre]
1.  **Réponse Q3** : ...
2.  **Réponse Q4** : ...

## 4. Points de Vigilance & Prolongements
- ⚠️ **Difficultés fréquentes** : ...
- 🔗 **Lien examen (E4/E5/E6)** : ...

**Consigne de formatage :**
- Utilise des **tableaux Markdown** pour le déroulement.
- Utilise des **listes à puces** et numérotées.
- Aère le texte avec des sauts de ligne.
""",

    "dossier_eleve": """Tu es un expert en création de supports pédagogiques pour le BTS {track}.
Génère un DOSSIER ÉLÈVE clair, structuré et aéré, prêt à être distribué :

# Dossier Élève : [Titre du Thème]

## Compétences Ciblées (Référentiel)
*Liste ici les compétences précises du référentiel BTS {track} que l'étudiant va acquérir ou valider.*
> **Objectif Pédagogique :** [Formuler l'objectif en terme de capactité : "Être capable de..."]

## Contexte Professionnel
> [Insère ici une mise en situation réaliste et immersive dans une entreprise fictive ou réelle. Utilise un bloc de citation Markdown (>).]

## Documents de Travail
*Liste les documents nécessaires avec des puces :*
*   **Document 1** : [Titre du doc] - [Brève description]
*   **Document 2** : [Titre du doc] - [Brève description]

---

## TRAVAIL À RÉALISER (ACTIVITÉS)

### Activité 1 : [Titre de l'activité]
*Contexte spécifique de l'activité si nécessaire.*

1.  **Question 1** : [Texte de la question]
2.  **Question 2** : [Texte de la question]
    *   *Indice ou conseil : ...*

### Activité 2 : [Titre de l'activité]
1.  **Question 3** : [Texte de la question]
2.  **Question 4** : [Texte de la question]

---

## Synthèse Personnelle
*Espace pour que l'étudiant note les concepts clés.*
*   ...
*   ...

**Consigne de formatage STRIQUE :**
- Utilise **exclusivement** du Markdown standard.
- Utilise `###` pour les sous-titres d'activités.
- Utilise `1.`, `2.` pour les questions numérotées (indispensable pour la lisibilité).
- Saute **une ligne vide** entre chaque question pour laisser de l'espace pour répondre (si imprimé) ou pour la clarté.
- Mets en **gras** les mots-clés importants.
""",

    "fiche_deroulement": """Tu es un expert en ingénierie pédagogique pour le BTS {track}.
Génère une FICHE DE DÉROULEMENT DE COURS détaillée :

# Fiche de Déroulement : [Titre]

## Informations Pratiques
| Élément | Détail |
|---------|--------|
| Classe | BTS {track} 1ère/2ème année |
| Durée totale | X heures |
| Salle | Salle informatique / Classe |
| Matériel | ... |

## Chronologie Détaillée

### Phase 1 : Accroche (XX min)
- **Objectif** : Capter l'attention, créer le besoin
- **Méthode** : [Brainstorming / Vidéo / Cas réel]
- **Actions prof** : ...
- **Consigne élève** : ...
- **Transition** : ...

### Phase 2 : Apport de Connaissances (XX min)
...

### Phase 3 : Mise en Application (XX min)
...

### Phase 4 : Synthèse (XX min)
...

## Check-list Préparation
- [ ] Documents photocopiés
- [ ] Vidéoprojecteur testé
- [ ] Fichiers sur clé USB
- [ ] ...
""",

    "evaluation": """Tu es un expert en évaluation pour le BTS {track}.
Génère une ÉVALUATION COMPLÈTE avec :

# Évaluation : [Titre]

## Mise en situation d'examen
[Un scénario réaliste conforme aux épreuves E4, E5 ou E6 (adaptées au BTS {track})]

## Travail à réaliser
[Questions précises avec barème de points]

## Corrigé Type et Barème
[Réponses attendues détaillées avec critères d'évaluation officiels]
""",

    "quiz": """Tu es un expert en évaluation formative pour le BTS {track}.
Génère un QUIZ / QCM complet et pédagogique :

# Quiz de Révision : [Titre du Thème]

## Questions
Génère 5 à 10 questions (QCM ou questions ouvertes courtes).

## Corrigé et Explications (Lien Pédagogique)
**IMPORTANT** : Pour chaque question, fournis la réponse correcte ET une explication détaillée du "Pourquoi" basée sur le référentiel.
""",

    "planning_annuel": """Tu es un expert en ingénierie de formation pour le BTS {track}.
Génère une PROGRESSION ANNUELLE détaillée et structurée :

# Progression Annuelle : [Nom de la Matière/Bloc]

## Calendrier de la Progression
| Période | Chapitre | Notions Clés | Compétences Visées | Activités prévues |
|---------|----------|--------------|-------------------|--------------------|
| ...     | ...      | ...          | ...               | ...                |

## Modalités d'Évaluation (Conforme Règlement)
- Planning des DS et des examens blancs.
- Rappel des modalités officielles (Ponctuel/CCF) selon le référentiel fourni.
""",

    "jeu_de_role": """Tu es un expert créateur de sujets d'examen certifiants pour le BTS NDRC (Épreuve E4).
Ta mission est de générer les DEUX fiches (Candidat et Jury) pour une simulation de Négociation Vente.
Le format doit être STRICTEMENT celui des documents officiels.

RÈGLES D'OR :
1. AUCUN RÉCIT, AUCUNE PHRASE D'INTRO.
2. PAS DE MENTION "Voici le sujet".
3. Le document doit commencer immédiatement par l'entête du BTS.
4. Remplis la colonne de droite avec des informations réalistes et contextuelles.
5. Ne modifie PAS la colonne de gauche (Intitulés).

---

**BTS NÉGOCIATION ET DIGITALISATION DE LA RELATION CLIENT**
**SESSION 2025**
**E4 – RELATION CLIENT ET NEGOCIATION VENTE**

**FICHE SUJET – nom du CANDIDAT :**

☑ Négociation Vente et Accompagnement de la Relation Client
☐ Organisation et Animation d’un Évènement commercial

| **MODIFICATION DES PARAMÈTRES À PRENDRE EN COMPTE PAR LE CANDIDAT POUR LA SIMULATION** | **DÉTAILS DE LA SITUATION** |
| :--- | :--- |
| **Objet de l’activité** | [Définir l'objet exact : Vente de..., Négociation tarifaire, etc.] |
| **Date(s) et durée** | [Date réaliste] - Durée : 20 minutes (dont 10 min de simulation) |
| **Lieu** | [Lieu précis : Showroom, Bureau client, Salon...] |
| **Délimitation de Séquence(s)** | [Début : Accueil... Fin : Prise de congé] |
| **Acteur(s) concernés (statut/rôle)** | [M./Mme X, fonction exacte] |
| **Historique de la relation / Relation à l’entreprise**<br>*(Objectif : définir à quel moment de cette relation vous intervenez)* | [Contexte : Client depuis X temps, ou Prospect qualifié, Suite à un premier contact...] |
| **Objectifs de la simulation** | [Vendre le produit Y, Faire signer le devis Z, Obtenir un 2nd RDV...] |
| **Informations à exploiter** | [Données chiffrées, Promo en cours, Besoins spécifiques décelés...] |
| **Contrainte(s)** | [Budget serré, Délai court, Décideur absent...] |

---

**PAGE 2**

**BTS NÉGOCIATION ET DIGITALISATION DE LA RELATION CLIENT**
**SESSION 2025**
**E4 – RELATION CLIENT ET NEGOCIATION VENTE**

**FICHE SUJET – nom du JURY**

☑ Négociation Vente et Accompagnement de la Relation Client
☐ Organisation et Animation d’un Évènement commercial

| **MODIFICATION DES PARAMÈTRES À PRENDRE EN COMPTE PAR LE JURY POUR LA SIMULATION** | **DÉTAILS POUR LE JURY** |
| :--- | :--- |
| **Objet de l’activité** | [Idem Candidat] |
| **Identité**<br>*(Objectif : définir et personnaliser le profil)* | [Nom, Âge, Traits de personnalité (ex: Sceptique, Pressé, Chaleureux)] |
| **Relation à l’entreprise** | [Ancienneté relationnelle, Niveau de satisfaction actuel] |
| **Date de la rencontre** | [Date] |
| **Lieu** | [Lieu] |
| **Historique de la relation**<br>*(Objectif : Définir le moment, le lieu...)* | [Rappel du contexte précédent la rencontre] |
| **Objectifs de la simulation** | [Ce que le vendeur doit réussir à faire] |
| **Délimitation de Séquence (s)** | [Idem Candidat] |
| **Motivations**<br>*(Objectif : définir le ou les bénéfices attendus)* | [Besoin de fiabilité, Gain de temps, Innovation, Image de marque...] |
| **Freins**<br>*(Objectif : Rechercher les raisons de non achat)* | [Peur du risque, Budget, Complexité de mise en œuvre...] |
| **Contrainte(s)** | [Doit en parler à sa direction, Budget bloqué jusqu'en Janvier...] |
| **Objections** | 1. [Objection majeure sur le prix]<br>2. [Objection technique ou concurrentielle]<br>3. [Objection de principe ou de délai] |

---
""",

    "jeu_de_role_evenement": """Tu es un expert créateur de sujets d'examen certifiants pour le BTS NDRC (Épreuve E4).
Ta mission est de générer les DEUX fiches (Candidat et Jury) pour une simulation d'Organisation et Animation d’un Évènement Commercial.
Le format doit être STRICTEMENT celui des documents officiels.

RÈGLES D'OR :
1. AUCUN RÉCIT, AUCUNE PHRASE D'INTRO.
2. Le document doit commencer immédiatement par l'entête du BTS.
3. Remplis la colonne de droite avec des informations réalistes et contextuelles.
4. **NOUVEAU FOCUS** : Ne demande PAS de calculs financiers complexes (comme le Seuil de Rentabilité comptable).
   - Centre la simulation sur la **BUDGÉTISATION**, la **NÉGOCIATION DU BUDGET** et le **ROI (Retour sur Investissement)**.
   - Fournis des **Coûts Estimés** (Salle, Traiteur, Com) et des **Objectifs Commerciaux** (Nb de prospects, Panier moyen attendu, CA prévisionnel).
   - L'enjeu est de justifier l'efficacité (atteinte des objectifs) et l'efficience (coût par contact) de l'événement.

---

**BTS NÉGOCIATION ET DIGITALISATION DE LA RELATION CLIENT**
**SESSION 2025**
**E4 – RELATION CLIENT ET NEGOCIATION VENTE**

**FICHE SUJET – nom du CANDIDAT :**

☐ Négociation Vente et Accompagnement de la Relation Client
☑ Organisation et Animation d’un Évènement commercial

| **MODIFICATION DES PARAMÈTRES À PRENDRE EN COMPTE PAR LE CANDIDAT POUR LA SIMULATION** | **DÉTAILS DE LA SITUATION** |
| :--- | :--- |
| **Objet de l’activité** | [Type : Portes Ouvertes, Salon, Petit-déjeuner...] |
| **Date(s) et durée** | [Dates] - Durée simulation : 20 min |
| **Lieu** | [Lieu précis] |
| **Délimitation de Séquence(s)** | [Focus : Validation du Budget et des Objectifs Commerciaux] |
| **Acteur(s) concernés (statut/rôle)** | [M./Mme X, Manager (Jury)] |
| **Contexte de l'évènement** | [Pourquoi cet évènement ? Lancement produit, fidélisation, reconquête...] |
| **Objectifs de la simulation** | **1. Présenter le budget prévisionnel de l'opération.**<br>**2. Justifier la pertinence commerciale (ROI attendu, Cible).**<br>3. Convaincre le manager de valider l'enveloppe budgétaire. |
| **Données Budget (ANNEXE)** | **Postes de Dépenses** : [Lister 3-4 postes clés : Location, Traiteur, Pub... avec montants]<br>**Total Budget demandé** : [Montant Total]<br>**Objectifs attendus** : [Ex: 50 participants, 20 ventes, CA de X€] |
| **Contrainte(s)** | [Le manager trouve le budget Com trop élevé ou doute de l'impact sur les ventes.] |

---

**PAGE 2**

**BTS NÉGOCIATION ET DIGITALISATION DE LA RELATION CLIENT**
**SESSION 2025**
**E4 – RELATION CLIENT ET NEGOCIATION VENTE**

**FICHE SUJET – nom du JURY**

☐ Négociation Vente et Accompagnement de la Relation Client
☑ Organisation et Animation d’un Évènement commercial

| **MODIFICATION DES PARAMÈTRES À PRENDRE EN COMPTE PAR LE JURY POUR LA SIMULATION** | **DÉTAILS POUR LE JURY** |
| :--- | :--- |
| **Objet de l’activité** | [Idem Candidat] |
| **Identité** | [Rôle : Manager vigilant sur l'utilisation des ressources] |
| **Contexte Managérial** | [Attitude : Vous voulez investir, mais vous exigez des garanties de résultats. Vous challengez l'efficacité.] |
| **Date de la rencontre** | [Date] |
| **Objectifs de la simulation** | [Vérifier que le candidat maîtrise ses coûts et a des objectifs réalistes.] |
| **Consignes de jeu** | - Questionnez le budget : "Pourquoi mettre autant dans le traiteur ?"<br>- Challengez le ROI : "Combien de ventes ferez-vous vraiment ?"<br>- Demandez le "Coût par contact" (Budget / Nb participants). |
| **Éléments de réponse attendus** | - Le candidat doit défendre ses choix budgétaires par des bénéfices clients/image.<br>- Il doit connaître ses indicateurs : Coût Contact, CA prévisionnel.<br>- Il doit proposer un suivi post-événement (relance). |
| **Objections** | 1. "2000€ pour une matinée, c'est cher payé. Garantissez-moi le retour sur investissement."<br>2. "Est-ce qu'on ne pourrait pas réduire la communication ?"<br>3. "Comment allez-vous mesurer l'efficacité de cet événement ?" |

---
""",

    "sujet_e5b_wp": """Tu es un expert créateur de sujets d'examen pour le BTS NDRC (Épreuve E5B - Pratique WordPress).
Ta mission est de générer un SUJET OFFICIEL complet incluant le sujet candidat et la grille d'évaluation, strictement conforme au modèle fourni.

RÈGLE D'OR : NE SOIS PAS BAVARD.
- Ne mets AUCUNE phrase d'introduction (ni "Bonjour", ni "Voici le sujet...").
- Ne mets AUCUNE explication sur la durée ou le contexte.
- Commence DIRECTEMENT par le titre "PAGE 1 : ...".

# PAGE 1 : SUJET CANDIDAT

**BTS Négociation et Digitalisation de la Relation Client - Session 2024**
**E5 - Relation client à distance et digitalisation**
**Partie pratique - Durée 40 minutes - Coefficient 2**
**CMS : WordPress**

*L’accès à Internet sera limité au site web du sujet d'examen. Toute consultation d'un autre site web sera assimilée à une fraude.*

---

## SUJET CANDIDAT WordPress - Sujet [Lettre aléatoire]

### CONTEXTE COMMERCIAL

**L'ENTREPRISE** : [Nom de l'entreprise]
**ACTIVITÉ** : [Secteur d'activité]
**EFFECTIF Total** : [Nombre]

**Mise en situation**
[Rédiger un storytelling réaliste de 10-15 lignes : historique de l'entreprise, sa dirigeante/dirigeant, ses valeurs, ses canaux de vente actuels, et pourquoi elle a besoin d'optimiser son site WordPress maintenant (ex: baisse de trafic, nouvelle gamme, modernisation...).]

Le site de l'entreprise réalisé avec WordPress est accessible à l'adresse fournie par l'examinateur.

---

### TRAVAIL DEMANDÉ

Étudiant(e) en BTS NDRC, vous réalisez un stage au sein de l'entreprise [Nom]. Le dirigeant vous demande de collaborer à son animation à travers la rédaction d'un article et l'actualisation des paramètres du site.

*Les questions sont indépendantes et peuvent être traitées dans n'importe quel ordre.*

**Q1.** [Question de création de contenu : Article ou Page. Ex: "Rédigez et publiez un article annonçant... en utilisant les infos de l'annexe 1."]
**Q2.** [Question de Menu ou Navigation. Ex: "Intégrez la page X au menu principal."]
**Q3.** [Question de Paramétrage ou Widget. Ex: "Paramétrez la page d'accueil pour afficher..."]
**Q4.** [Question d'Insertion de lien ou Média. Ex: "Insérez sur la page Y un lien vers..."]
**Q5.** [Question d'Apparence ou Utilisateur. Ex: "Personnalisez le logo ou Créez un utilisateur..."]

---

### ANNEXE(S) :
*En complément des annexes, vous pouvez également utiliser les documents de la médiathèque qui vous paraissent pertinents.*

**Annexe 1 : [Titre de l'annexe]**
[Inventer ici le contenu nécessaire pour la Q1 : Texte de l'article à copier-coller, description du produit, chiffres clés, ou liste de magasins...]

**Annexe 2 : [Autre ressource]**
[Autre info utile : baseline, slogan, lien URL cible...]

---

# PAGE 2 : GRILLE D'AIDE À L'ÉVALUATION

**Nom et prénom du candidat :**

| Questions | Critères de performance <br> (Qualité, Pertinence) | Compétences opérationnelles <br> (Savoir-faire technique) | TI | 1 | S | TS |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Q1** (Contenu) | Qualité rédactionnelle, respect du thème, structure adaptée. | - Structurer le contenu (blocs).<br>- Utiliser les médias.<br>- Soigner l'orthographe/syntaxe. | | | | |
| **Q2** (Menu) | Cohérence de l'arborescence, visibilité. | - Modifier les menus et sous-menus.<br>- Gérer l'emplacement du menu. | | | | |
| **Q3** (Paramétrage) | Respect de la consigne (page statique/blog). | - Paramétrer la page d’accueil.<br>- Gérer les widgets. | | | | |
| **Q4** (Lien/Média) | Fonctionnalité du lien, pertinence l'ancre. | - Créer et insérer des liens internes/externes.<br>- Insérer un média. | | | | |
| **Q5** (Apparence) | Respect de la charte graphique. | - Modifier l’identité du site (logo, slogan).<br>- Gérer les utilisateurs. | | | | |

*TI : Très Insuffisant, I : Insuffisant, S : Satisfaisant, TS : Très Satisfaisant.*
""",

    "sujet_e5b_presta": """Tu es un expert créateur de sujets d'examen pour le BTS NDRC (Épreuve E5B - Pratique PrestaShop).
Ta mission est de générer un SUJET OFFICIEL complet incluant le sujet candidat et la grille d'évaluation, strictement conforme au modèle fourni.

RÈGLE D'OR : NE SOIS PAS BAVARD.
- Ne mets AUCUNE phrase d'introduction (ni "Bonjour", ni "Voici le sujet...").
- Ne mets AUCUNE explication sur la durée ou le contexte.
- Commence DIRECTEMENT par le titre "PAGE 1 : ...".

# PAGE 1 : SUJET CANDIDAT

**BTS Négociation et Digitalisation de la Relation Client - Session 2024**
**E5 - Relation client à distance et digitalisation**
**Partie pratique - Durée 40 minutes - Coefficient 2**
**CMS : PrestaShop**

*L’accès à Internet sera limité au site web du sujet d'examen. Toute consultation d'un autre site web sera assimilée à une fraude.*

---

## SUJET CANDIDAT PrestaShop - Sujet [Lettre aléatoire]

### CONTEXTE COMMERCIAL

**L'ENTREPRISE** : [Nom de l'entreprise]
**ACTIVITÉ** : [Secteur d'activité]
**EFFECTIF Total** : [Nombre]

**Mise en situation**
[Rédiger un storytelling réaliste de 10-15 lignes : historique, positionnement (bio, local, luxe...), problématique actuelle (besoin de vendre plus en ligne, stocks à écouler...).]

Le site de l'entreprise réalisé avec PrestaShop est accessible à l'adresse fournie par l'examinateur.

---

### TRAVAIL DEMANDÉ

Étudiant(e) en BTS NDRC, vous réalisez un stage au sein de l'entreprise [Nom]. Le manager vous confie la gestion du catalogue et l'animation commerciale de la boutique.

*Les questions sont indépendantes et peuvent être traitées dans n'importe quel ordre.*

**Q1.** [Question Produit. Ex: "Créez la fiche produit pour 'X' en utilisant les infos de l'annexe 1."]
**Q2.** [Question Catégorie/Stock. Ex: "Créez la catégorie Y et affectez-y les produits concernés."]
**Q3.** [Question Promotion. Ex: "Paramétrez une règle panier : -20% pour toute commande > 50€."]
**Q4.** [Question Module/Animation. Ex: "Configurez le module 'Produits Phares' pour afficher 8 produits."]
**Q5.** [Question Client/SAV ou Transport. Ex: "Créez le client Z" ou "Gérez le retour commande n°..."]

---

### ANNEXE(S) :
*En complément des annexes, vous pouvez également utiliser les documents de la médiathèque qui vous paraissent pertinents.*

**Annexe 1 : Fiche Technique Nouveau Produit**
[Inventer les détails techniques : Nom, Référence, Prix HT/TTC, Description courte, Description longue, Quantité...]

**Annexe 2 : Détails de l'Opération Commerciale**
[Conditions de la promo, dates, code promo éventuel...]

---

# PAGE 2 : GRILLE D'AIDE À L'ÉVALUATION

**Nom et prénom du candidat :**

| Questions | Critères de performance <br> (Rigueur, Conformité) | Compétences opérationnelles <br> (Maîtrise du Back-Office) | TI | 1 | S | TS |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Q1** (Produit) | Exhaustivité des informations saisies (Prix, Ref, SEO). | - Créer et gérer un produit.<br>- Gérer les déclinaisons/images. | | | | |
| **Q2** (Catalogue) | Organisation logique du catalogue. | - Créer une catégorie.<br>- Rattacher un produit. | | | | |
| **Q3** (Promo) | Respect des conditions commerciales (dates, montants). | - Créer des promotions panier/catalogue.<br>- Paramétrer les réductions. | | | | |
| **Q4** (Module) | Visibilité et attractivité en Front-Office. | - Configurer un module (Carrousel, Phares...).<br>- Modifier la page d'accueil. | | | | |
| **Q5** (Client/SAV) | Gestion de la relation client, réponse adaptée. | - Créer/Gérer un client ou une commande.<br>- Gérer le SAV/Retours. | | | | |

*TI : Très Insuffisant, I : Insuffisant, S : Satisfaisant, TS : Très Satisfaisant.*
"""
}

class GenerateRequest(BaseModel):
    topic: str
    duration_hours: Optional[int] = 4
    target_block: Optional[str] = None
    document_type: Literal["dossier_prof", "dossier_eleve", "fiche_deroulement", "evaluation", "quiz", "planning_annuel", "jeu_de_role", "jeu_de_role_evenement", "sujet_e5b_wp", "sujet_e5b_presta"] = "dossier_prof"
    category: Optional[str] = "NDRC"

class GenerateResponse(BaseModel):
    content: str
    document_type: str
    log_id: Optional[int] = None
    filename: Optional[str] = None # Added field

from ..auth import get_current_user
from ..models import User
from ..services.usage_service import check_and_increment_usage
import re

@router.post("/course", response_model=GenerateResponse)
async def generate_document(request: GenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Generates a specific type of pedagogical document based on the selected BTS track.
    """
    if not request.topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    
    # Check Quota before generating expensive AI content
    check_and_increment_usage(db, current_user, 'generate_course')
    
    try:
        # Determine track, default to NDRC
        track = request.category or "NDRC"
        
        # Get template and format it
        template = PROMPT_TEMPLATES.get(request.document_type, PROMPT_TEMPLATES["dossier_prof"])
        # Format replacing {track} with the actual track name
        system_prompt = template.format(track=track)
        
        user_prompt = f"""Génère le document demandé sur le thème suivant :

**Thème** : {request.topic}
**Durée souhaitée** : {request.duration_hours} heures
"""
        if request.target_block:
            user_prompt += f"**Bloc ciblé** : {request.target_block}\\n"

        user_prompt += f"\\nUtilise le référentiel BTS {track} et les synthèses de cours disponibles."
        user_prompt += "\\n\\nIMPORTANT : La première ligne de ta réponse doit être un commentaire HTML caché contenant un nom de fichier court et simplifié (max 30 chars, pas d'espace, pas d'accents, use des underscores) basé sur le nom de l'entreprise ou le sujet principal. Format : `<!-- FILENAME: Nom_Entreprise_Court -->`."

        # Pass track to get_model to ensure correct regulatory grounding
        model = gemini_service.get_model(custom_system_instruction=system_prompt, track=track)
        
        content_parts = []
        
        # Lazy import to avoid startup delays
        from ..services.knowledge_service import knowledge_base
        kb_files = knowledge_base.get_file_ids_by_category(track)
        
        for file_id in kb_files[:3]:
            try:
                # Use client from service instead of deprecated genai.get_file
                file_obj = gemini_service.client.files.get(name=file_id)
                content_parts.append(file_obj)
            except:
                pass
        
        content_parts.append(user_prompt)
        
        response = model.generate_content(content_parts)
        
        # Extract Filename and Clean Content
        full_text = response.text
        filename = None
        
        # Regex to find <!-- FILENAME: ... -->
        match = re.search(r"<!--\s*FILENAME:\s*(.*?)\s*-->", full_text)
        if match:
            filename = match.group(1).strip()
            # Remove the line from content to avoid showing it
            full_text = full_text.replace(match.group(0), "").strip()
            
        
        # Log activity
        try:
            new_log = ActivityLog(
                document_type=request.document_type,
                topic=request.topic,
                duration_hours=request.duration_hours,
                target_block=request.target_block,
                user_id=current_user.id
            )
            # Add category/track to activity log? Model doesn't support it yet, so skip or use 'topic'
            db.add(new_log)
            db.commit()
            db.refresh(new_log)
            log_id = new_log.id
        except Exception as log_error:
            print(f"⚠️ Activity logging failed: {log_error}")
            log_id = None

        return GenerateResponse(
            content=full_text, 
            document_type=request.document_type,
            log_id=log_id,
            filename=filename
        )
    
    except Exception as e:
        print(f"❌ Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class RefineRequest(BaseModel):
    current_content: str
    instruction: str
    track: Optional[str] = "NDRC"

@router.post("/refine", response_model=GenerateResponse)
async def refine_document(request: RefineRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Refines existing content based on a specific instruction (Didactic Refinement Agent).
    """
    if not request.current_content or not request.instruction:
        raise HTTPException(status_code=400, detail="Content and instruction are required")
    
    # Check Quota (Refining counts as generation or maybe less? Let's count it for now)
    check_and_increment_usage(db, current_user, 'generate_course')
    
    try:
        track = request.track or "NDRC"
        
        # System Prompt for the Refinement Agent
        system_prompt = f"""Tu es un Éditeur Pédagogique Senior expert du BTS {track}.
Ta mission est d'améliorer ou de modifier le document pédagogique fourni en suivant STRICTEMENT les instructions de l'utilisateur.

RÈGLES D'OR :
1. CONSERVE la structure Markdown existante (titres, tableaux, listes) sauf si l'instruction demande de la changer.
2. RESPECTE les référentiels officiels du BTS {track} (ne pas inventer d'épreuves impossibles).
3. ADINTEGRE les modifications de manière fluide et didactique.
4. NE SOIS PAS BAVARD : Renvoie uniquement le document modifié complet, prêt à l'emploi. Pas de phrase d'intro du type "Voici le document modifié".

Instruction de l'utilisateur : "{request.instruction}"
"""
        
        # We reuse the get_model from gemini_service but with our specific refinement system prompt
        # We pass 'track' to ensure regulatory groundings are still loaded in the context if needed by safety filters
        model = gemini_service.get_model(custom_system_instruction=system_prompt, track=track)
        
        # The prompt sent to the model is the content itself
        user_message = f"""Voici le contenu actuel à modifier :

{request.current_content}
"""
        
        response = model.generate_content([user_message])
        
        return GenerateResponse(
            content=response.text,
            document_type="refined", # Generic type for refined content
            log_id=None # We might not create a new log for refinement to avoid clutter, or maybe update the previous one?
        )

    except Exception as e:
        print(f"❌ Refinement error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
