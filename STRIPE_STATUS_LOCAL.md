# 💳 Stripe - État des lieux en LOCAL

Date : 14/01/2026  
Environnement : Développement local (branche `dev`)

---

## ✅ **Ce qui est en place**

### **1. Backend (`/backend/app/routers/stripe_routes.py`)**

#### Endpoints disponibles :
- ✅ `POST /api/stripe/create-checkout-session` - Créer une session de paiement
- ✅ `POST /api/stripe/webhook` - Recevoir les webhooks Stripe

#### Configuration actuelle :
```python
# Prix : 9,99€/mois
unit_amount: 999  # centimes
mode: 'subscription'
interval: 'month'
```

#### Variables d'environnement :
- ✅ `STRIPE_SECRET_KEY` = `sk_test_51Soofu...` (présente dans `.env`)
- ⚠️ `STRIPE_WEBHOOK_SECRET` = NON DÉFINIE (nécessaire pour webhooks)
- ✅ `FRONTEND_URL` = `http://localhost:3001`

### **2. Frontend (`/frontend/app/onboarding/page.tsx`)**

#### Workflow :
1. Utilisateur choisit "Essai Gratuit" OU "Abonnement Pro"
2. Si "Essai Gratuit" → Enregistrement direct (pas de paiement)
3. Si "Abonnement Pro" → Redirect vers Stripe Checkout

#### Problèmes identifiés :
- ⚠️ Ligne 54 : `priceId: "price_1Igx4HL..."` - **Price ID invalide / placeholder**
- Le paramètre `priceId` est envoyé mais PAS utilisé par le backend

### **3. Base de données**

#### Modèle User :
```python
plan_selection: str  # "trial" ou "subscription"
stripe_customer_id: str | None  # ID client Stripe
```

#### Webhook handler :
- ✅ Écoute l'événement `checkout.session.completed`
- ✅ Met à jour `plan_selection` = "subscription"
- ✅ Enregistre `stripe_customer_id`

---

## ⚠️ **Ce qui NE fonctionne PAS actuellement**

### **1. Price ID manquant**
❌ Le frontend envoie un `priceId` bidon  
❌ Le backend ne l'utilise PAS et crée un prix inline à chaque fois

**Impact** : Fonctionne pour des tests, mais pas optimal pour la production.

### **2. Webhook Secret non configuré**
❌ `STRIPE_WEBHOOK_SECRET` n'est pas défini dans `.env`

**Impact** : Les webhooks Stripe ne peuvent PAS être vérifiés. Les paiements seront acceptés mais le backend ne pourra pas confirmer qu'ils viennent vraiment de Stripe.

### **3. Webhooks en local**
❌ Stripe ne peut pas envoyer de webhooks vers `localhost` directement

**Impact** : Pour tester les webhooks en local, il faut utiliser **Stripe CLI** avec `stripe listen --forward-to localhost:8000/api/stripe/webhook`

### **4. Gestion des abonnements**
❌ Pas de page pour gérer l'abonnement (annuler, modifier)  
❌ Pas de gestion des échecs de paiement  
❌ Pas de renouvellement automatique visible

---

## 🧪 **Test en local - MODE TEST Stripe**

### **Workflow de test complet :**

1. ✅ Un utilisateur s'inscrit
2. ✅ Il arrive sur `/onboarding`
3. ✅ Il choisit "Abonnement Pro"
4. ✅ Il clique sur "Confirmer mon choix"
5. ✅ Le backend crée une session Stripe et retourne une URL
6. ✅ L'utilisateur est redirigé vers Stripe Checkout (page de paiement)
7. 🧪 L'utilisateur entre les **cartes de test** Stripe :
   - Carte valide : `4242 4242 4242 4242`
   - Expiration : N'importe quelle date future (ex: 12/25)
   - CVC : N'importe quel 3 chiffres (ex: 123)
8. ✅ Après paiement → Redirect vers `/onboarding?success=true&session_id=...`
9. ⚠️ **MAIS** : Sans webhook local, le statut n'est PAS mis à jour automatiquement

---

## 🔧 **Pour que ça fonctionne à 100% en local**

### **Option A : Tester sans webhooks (limite)**

1. Lancez l'app (déjà fait)
2. Allez sur http://localhost:3001/onboarding
3. Sélectionnez "Abonnement Pro"
4. Utilisez la carte de test : `4242 4242 4242 4242`
5. ✅ Vous serez redirigé après paiement
6. ⚠️ MAIS le statut utilisateur NE sera PAS mis à jour (pas de webhook)

### **Option B : Tester AVEC webhooks (complet)** ⭐ RECOMMANDÉ

#### Prérequis :
- Installer Stripe CLI : `brew install stripe/stripe-cli/stripe`

#### Étapes :

1. **Lancer Stripe CLI** (terminal 3) :
```bash
cd /Users/imac2jacques/Desktop/antigravity/profvirtuel/backend
stripe login
stripe listen --forward-to localhost:8000/api/stripe/webhook
```

2. **Copier le webhook secret** affiché par Stripe CLI :
```
> whsec_...
```

3. **Ajouter dans `.env`** :
```bash
echo "STRIPE_WEBHOOK_SECRET=whsec_..." >> .env
```

4. **Relancer le backend** pour prendre en compte la nouvelle variable

5. **Tester le paiement** :
   - Allez sur http://localhost:3001/onboarding
   - Sélectionnez "Abonnement Pro"
   - Payez avec `4242 4242 4242 4242`
   - ✅ Le webhook sera reçu et le statut mis à jour !

---

## 📊 **Recommandations**

### **Court terme (pour tester en local) :**

1. ✅ Installer Stripe CLI
2. ✅ Configurer `STRIPE_WEBHOOK_SECRET`
3. ✅ Tester un paiement complet avec webhooks

### **Moyen terme (avant production) :**

1. 🔧 Créer un vrai **Price** dans Stripe Dashboard
2. 🔧 Remplacer le `priceId` bidon par le vrai ID
3. 🔧 Supprimer le code qui crée des prix inline
4. 🔧 Ajouter une page "Mon abonnement" pour gérer/annuler

### **Long terme (production) :**

1. 📧 Envoyer des emails de confirmation de paiement
2. 📧 Gérer les échecs de paiement et relances
3. 📊 Dashboard admin pour voir les abonnements actifs
4. 💰 Porter sur Stripe Public Keys en production (pas test)

---

## 🎯 **Statut actuel : FONCTIONNEL mais INCOMPLET**

### Fonctionne :
- ✅ Création de session Stripe
- ✅ Redirect vers Stripe Checkout
- ✅ Paiement test possible
- ✅ Webhook handler codé

### Ne fonctionne pas / manque :
- ⚠️ Webhooks non testables sans Stripe CLI
- ⚠️ Pas de confirmation visuelle après paiement
- ⚠️ Pas de gestion d'abonnement
- ⚠️ Price ID hardcodé/bidon

---

## 💡 **Actions suggérées MAINTENANT**

Que voulez-vous faire ?

**A)** Tester un paiement maintenant (sans webhooks) → Je vous guide  
**B)** Installer Stripe CLI et tester avec webhooks → Je vous aide  
**C)** Créer un vrai Price dans Stripe Dashboard → Étapes pas à pas  
**D)** Juste comprendre, pas tester pour l'instant → OK !

---

**Dites-moi ce que vous voulez faire !** 😊
