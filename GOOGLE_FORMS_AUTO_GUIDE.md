# 🎯 Google Forms Auto - Guide d'utilisation

## ✨ Nouvelle fonctionnalité

Vous pouvez maintenant **créer automatiquement des Google Forms** interactifs à partir de vos quiz !

---

## 📋 Prérequis

### ⚠️ IMPORTANT : Vous devez vous reconnecter !

Les nouveaux scopes Google Forms ont été ajoutés. Pour les obtenir :

1. **Déconnectez-vous** de l'application
2. **Reconnectez-vous avec Google**
3. **Acceptez les nouvelles autorisations** (Google Forms + Google Drive)

Sans cela, le bouton "Google Form Auto" ne fonctionnera pas.

---

## 🚀 Comment utiliser

### Étape 1 : Générer un quiz

1. Allez sur http://localhost:3001/generate
2. Sélectionnez **"Quiz / QCM"**
3. Entrez un sujet (ex: "La prospection commerciale")
4. Cliquez sur **"Générer Quiz / QCM"**

### Étape 2 : Créer le Google Form

1. Une fois le quiz généré, cherchez le bouton **"Google Form Auto"** (violet/indigo)
2. Cliquez dessus
3. ⏳ Attendez quelques secondes (le serveur parse les questions et crée le formulaire)
4. ✅ Une popup confirme la création avec le lien du formulaire
5. 🔗 Le formulaire s'ouvre automatiquement dans un nouvel onglet

---

## ✅ Ce qui est fait automatiquement

- ✅ **Parsing du Q CM** - Questions et réponses extraites du markdown
- ✅ **Création du Google Form** - Formulaire créé avec Google Forms API
- ✅ **Mode QUIZ activé** - Le formulaire est configuré en mode quiz
- ✅ **Correction automatique** - Les bonnes réponses sont pré-configurées
- ✅ **Points attribués** - 1 point par question
- ✅ **Mode BROUILLON** - Le formulaire reste privé jusqu'à publication manuelle

---

## 🔧 Fonctionnalités

### Format reconnu

Le parser reconnaît ce format (généré par l'IA) :

```markdown
### Question 1
Qu'est-ce que la méthode SONCAS ?

a) Une technique de vente
b) Un logiciel CRM
c) Une méthode comptable
d) Un type de contrat

**Réponse correcte : a) Une technique de vente**
```

### Ce qui est créé dans Google Forms

- Type de question : **Choix multiple** (Radio buttons)
- Questions obligatoires : **Oui**
- Mélange des réponses : **Non** (dans l'ordre a, b, c, d)
- Notation : **1 point** par question
- Feedback

 : **Activé** (affiche la bonne réponse)

---

## 📊 Après création

### Vérification recommandée

1. ✅ **Ouvrez le formulaire** (s'ouvre automatiquement)
2. ✅ **Vérifiez les questions** - Toutes les questions sont-elles correctes ?
3. ✅ **Vérifiez les réponses** - Les bonnes réponses sont-elles bien marquées ?
4. ✅ **Personnalisez si besoin** - Ajoutez un en-tête, changez le thème, etc.
5. ✅ **Publiez** - Cliquez sur "Envoyer" dans Google Forms

### Options de partage

Depuis Google Forms, vous pouvez :
- 📧 Envoyer par email
- 🔗 Obtenir un lien de partage
- 📋 Intégrer dans un site web
- 📚 **Attacher à Google Classroom** (via l'interface Google Classroom)

---

## 🐛 Résolution de problèmes

### Le bouton "Google Form Auto" n'apparaît pas

- ❌ Vous n'êtes pas connecté avec Google
- ❌ Vous ne vous êtes pas reconnecté depuis l'ajout des scopes
- ✅ **Solution** : Déconnectez-vous et reconnectez-vous avec Google

### Erreur "Erreur 403" ou "Insufficient permissions"

- ❌ Les scopes Google Forms ne sont pas autorisés
- ✅ **Solution** : Déconnectez-vous complètement, puis reconnectez-vous et acceptez toutes les autorisations

### Erreur "Aucune question n'a pu être extraite"

- ❌ Le format du quiz n'est pas reconnu
- ✅ **Solution** : Régénérez le quiz (l'IA utilise normalement le bon format)

### Le formulaire est créé mais les réponses sont incorrectes

- ⚠️ Le parser a mal interprété les réponses
- ✅ **Solution** : Modifiez manuellement dans Google Forms avant de publier

---

## 💡 Astuces

### Workflow recommandé

1. **Générez le quiz** avec l'IA
2. **Créez le Google Form Auto**
3. **Vérifiez le formulaire** dans Google Forms
4. **Ajustez si nécessaire** (titre, description, thème)
5. **Publiez** et partagez avec vos élèves

### Combiner avec Classroom

1. Créez le Google Form Auto
2. Allez sur Google Classroom (web)
3. Créez un devoir et **attachez le Google Form**
4. Les réponses seront automatiquement collectées

### Réutilisation

Les Google Forms créés restent dans votre Google Drive. Vous pouvez :
- Les dupliquer
- Les modifier
- Les réutiliser pour d'autres classes

---

## 📝 Limitations actuelles

- ⚠️ Fonctionne uniquement avec les **quiz générés** (pas le contenu du chat)
- ⚠️ Format attendu : **Questions numérotées avec a) b) c) d)**
- ⚠️ Maximum testé : **~20 questions** (peut planter avec de très longs quiz)
- ⚠️ Correction automatique : **QCM uniquement** (pas de questions ouvertes)

---

## 🔜 Améliorations futures possibles

- [ ] Support de questions ouvertes
- [ ] Support de questions Vrai/Faux
- [ ] Feedback personnalisé par question
- [ ] Images dans les questions
- [ ] Limitation de temps
- [ ] Rattachement direct à un devoir Classroom

---

**Besoin d'aide ?** Testez d'abord avec un petit quiz (3-5 questions) pour vous familiariser !
