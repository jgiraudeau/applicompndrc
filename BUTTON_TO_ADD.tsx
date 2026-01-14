// INSÉRER CE CODE APRÈS LE BOUTON "COPIER" (ligne ~561)
// Remplacer cette ligne :
//                                 </Button>
//                             </div>
//
// Par ceci :

                                </Button >

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
                            </div >
