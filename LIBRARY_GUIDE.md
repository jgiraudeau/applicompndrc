# 📚 Bibliothèque de Supports - Guide d'utilisation

## ✅ Ce qui a été implémenté

### Backend
1. **Modèle de données** `GeneratedDocument` créé dans `models.py`
2. **Router `/api/library`** avec les endpoints :
   - `POST /save` - Sauvegarder un document
   - `GET /list` - Lister tous les documents de l'utilisateur
   - `GET /{id}` - Récupérer un document spécifique
   - `DELETE /{id}` - Supprimer un document

### Frontend
1. **Page `/library`** créée - Page complète pour consulter et supprimer les supports
2. **Lien "Mes Supports"** ajouté dans la Navbar (icône vert)

---

## 🔧 À faire manuellement (simple)

### Ajouter le bouton "Sauvegarder" dans `/generate`

**Fichier** : `frontend/app/generate/page.tsx`

#### 1. Ajouter les états (après la ligne 43)

```tsx
const [isSaving, setIsSaving] = useState(false);
const [isSaved, setIsSaved] = useState(false);
```

#### 2. Ajouter la fonction handleSave (après handleCreateGoogleForm, ligne ~171)

```tsx
const handleSave = async () => {
    setIsSaving(true);
    try {
        const token = (session as any)?.accessToken;
        const res = await fetch(`${API_BASE_URL}/api/library/save`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: topic,
                document_type: docType,
                content: generatedContent,
                duration_hours: duration,
                target_block: block || null
            })
        });

        if (res.ok) {
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
            alert("✅ Document sauvegardé dans 'Mes Supports' !");
        } else {
            alert("❌ Erreur lors de la sauvegarde");
        }
    } catch (e: any) {
        console.error(e);
        alert(`Erreur: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
};
```

#### 3. Ajouter le bouton "Sauvegarder" (ligne ~443, après le bouton "Copier")

```tsx
<Button 
    variant="outline" 
    size="sm" 
    onClick={handleSave}
    disabled={isSaving}
    className="text-green-600 border-green-100 hover:bg-green-50"
>
    {isSaving ? (
        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-1" />
    ) : isSaved ? (
        <>
            <Check className="w-4 h-4 mr-1" />
            Sauvegardé !
        </>
    ) : (
        <>
            <BookmarkPlus className="w-4 h-4 mr-1" />
            Sauvegarder
        </>
    )}
</Button>
```

#### 4. Ajouter l'import manquant (ligne ~9)

```tsx
import { ..., BookmarkPlus } from "lucide-react";
```

---

## 🧪 Test complet

### 1. Tester la page /library

1. Allez sur http://localhost:3001/library
2. Vous devriez voir la page "Mes Supports" (vide pour l'instant)

### 2. Sauvegarder un document

1. Allez sur http://localhost:3001/generate
2. Générez un document (ex: Dossier Élève)
3. **APRÈS avoir ajouté le bouton**, cliquez sur "Sauvegarder"
4. Vérifiez que l'alerte "Document sauvegardé" apparaît

### 3. Consulter les supports sauvegardés

1. Cliquez sur "Mes Supports" dans la navbar
2. Votre document devrait apparaître dans la liste
3. Cliquez dessus pour l'afficher
4. Testez la suppression

---

## 📊 Fonctionnalités

### Page "Mes Supports" (`/library`)

- ✅ Liste tous les documents sauvegardés
- ✅ Filtrage par type (automatique)
- ✅ Aperçu du contenu complet
- ✅ Suppression avec confirmation
- ✅ Lien vers Google Doc si disponible
- ✅ Interface intuitive (sidebar + preview)

### Données sauvegardées

Pour chaque document :
- Titre (sujet du cours)
- Type de document (dossier_prof, quiz, etc.)
- Contenu complet (markdown)
- Durée (heures)
- Bloc ciblé
- URL Google Doc (si créé via Classroom)
- Dates de création et modification

---

## 🔐 Sécurité

- ✅ Authentification requise (JWT)
- ✅ Chaque utilisateur voit uniquement SES documents
- ✅ Impossible de supprimer les documents d'autrui

---

## 💡 Améliorations futures possibles

- [ ] Recherche dans les supports
- [ ] Tags/catégories personnalisés
- [ ] Export multiple (ZIP)
- [ ] Partage entre enseignants
- [ ] Modification du contenu sauvegardé
- [ ] Favoris / épinglés

---

**Besoin d'aide pour l'ajout du bouton ? N'hésitez pas !** 😊
