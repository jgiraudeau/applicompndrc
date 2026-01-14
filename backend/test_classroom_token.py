"""
Test de diagnostic Google Classroom
Ce script teste si le token Google avec les scopes Classroom fonctionne
"""
import requests
import sys

def test_classroom_token(token):
    """Test basique de l'API Classroom avec un token"""
    
    print("🔍 Test 1: Vérification du token...")
    print(f"Token reçu (premiers caractères): {token[:20]}...")
    
    # Test 1: Tokeninfo (vérifier les scopes)
    print("\n🔍 Test 2: Vérification des scopes du token...")
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?access_token={token}"
    try:
        response = requests.get(tokeninfo_url)
        if response.ok:
            info = response.json()
            print("✅ Token valide!")
            print(f"   Email: {info.get('email', 'N/A')}")
            print(f"   Scopes autorisés:")
            scopes = info.get('scope', '').split()
            for scope in scopes:
                print(f"      - {scope}")
            
            # Vérifier les scopes Classroom
            classroom_scopes = [
                'https://www.googleapis.com/auth/classroom.courses.readonly',
                'https://www.googleapis.com/auth/classroom.coursework.students'
            ]
            missing_scopes = []
            for cs in classroom_scopes:
                if cs not in scopes:
                    missing_scopes.append(cs)
            
            if missing_scopes:
                print("\n❌ PROBLÈME: Scopes Classroom manquants:")
                for ms in missing_scopes:
                    print(f"   - {ms}")
                return False
            else:
                print("\n✅ Tous les scopes Classroom sont présents!")
        else:
            print(f"❌ Erreur tokeninfo: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Erreur lors de la vérification du token: {e}")
        return False
    
    # Test 2: Lister les cours
    print("\n🔍 Test 3: Tentative de récupération des cours...")
    courses_url = "https://classroom.googleapis.com/v1/courses"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    params = {
        "teacherId": "me",
        "pageSize": 5,
        "courseStates": "ACTIVE"
    }
    
    try:
        response = requests.get(courses_url, headers=headers, params=params)
        if response.ok:
            data = response.json()
            courses = data.get('courses', [])
            print(f"✅ API Classroom fonctionne! Trouvé {len(courses)} cours:")
            for course in courses[:3]:
                print(f"   - {course['name']} (ID: {course['id']})")
            return True
        else:
            print(f"❌ Erreur API Classroom: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de l'appel API Classroom: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_classroom_token.py <google_access_token>")
        print("\nPour obtenir le token:")
        print("1. Connectez-vous sur http://localhost:3001")
        print("2. Ouvrez la console (F12)")
        print("3. Tapez: localStorage.getItem('nextauth.token') ou inspectez la session")
        sys.exit(1)
    
    token = sys.argv[1]
    success = test_classroom_token(token)
    
    if success:
        print("\n✅ RÉSULTAT: Google Classroom est fonctionnel!")
    else:
        print("\n❌ RÉSULTAT: Problème détecté avec Google Classroom")
