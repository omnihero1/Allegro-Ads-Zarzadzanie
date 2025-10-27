# Firebase Authentication Setup - Google SSO

## 📋 Wymagane kroki do włączenia logowania Google

### 1. **Włącz Google Sign-In w Firebase Console**

1. Otwórz: https://console.firebase.google.com/project/allegro-ads-management-fe724/authentication/providers
2. W sekcji "Sign-in providers" znajdź **Google**
3. Kliknij na Google, aby otworzyć konfigurację
4. **Włącz toggle "Enable"**
5. Ustaw **Project support email** (np. twój email firmowy)
6. Kliknij **"Save"**

### 2. **Dodaj domeny do authorized domains**

1. W Firebase Console przejdź do: **Authentication → Settings → Authorized domains**
2. Domyślnie `localhost` jest już dodany (do testów lokalnych)
3. Dodaj domenę produkcyjną gdy będziesz gotowy do deploy (np. `allegro-ads.web.app` lub własną domenę)

### 3. **Opcjonalnie: Skonfiguruj OAuth Consent Screen w Google Cloud Console**

Jeśli chcesz dostosować ekran zgody OAuth:

1. Otwórz: https://console.cloud.google.com/apis/credentials/consent
2. Wybierz projekt: **allegro-ads-management-fe724**
3. Skonfiguruj:
   - **App name:** Allegro Ads Management
   - **User support email:** twój email
   - **Developer contact:** twój email
   - **Authorized domains:** omnihero.pl

### 4. **Ograniczenie do domeny @omnihero.pl**

✅ **Już zaimplementowane w kodzie:**

- Frontend weryfikuje domenę podczas logowania
- Backend może dodatkowo weryfikować token (opcjonalnie)
- Użytkownicy spoza domeny `@omnihero.pl` nie mogą się zalogować

## 🧪 Testowanie

### Lokalnie (http://localhost:5173)

1. Uruchom aplikację: `npm run dev` lub `npm run build && npx serve -s dist -l 5173`
2. Otwórz: http://localhost:5173
3. Zostaniesz przekierowany do `/login`
4. Kliknij "Zaloguj przez Google"
5. Wybierz konto `@omnihero.pl`

**Ważne:** W trybie development Google może pokazać ostrzeżenie "This app isn't verified". To normalne - kliknij "Advanced" → "Go to [App name] (unsafe)" aby kontynuować.

### Weryfikacja ograniczenia domeny

Spróbuj zalogować się kontem spoza `@omnihero.pl`:
- ❌ Powinieneś zobaczyć błąd: "Dostęp ograniczony do domeny @omnihero.pl"
- ✅ Zostaniesz automatycznie wylogowany

## 🚀 Deployment do Firebase Hosting

### Opcja 1: Firebase Hosting (Zalecane)

```bash
# 1. Install Firebase CLI (jeśli nie masz)
npm install -g firebase-tools

# 2. Login do Firebase
firebase login

# 3. Zbuduj aplikację
cd allegro-ads-dashboard
npm run build

# 4. Deploy
firebase deploy --only hosting
```

Po deploy aplikacja będzie dostępna pod: `https://allegro-ads-management-fe724.web.app`

**Pamiętaj:** Dodaj tę domenę do "Authorized domains" w Firebase Console!

### Opcja 2: Własna domena

1. Deploy do Firebase Hosting (jak powyżej)
2. W Firebase Console: **Hosting → Add custom domain**
3. Podaj swoją domenę (np. `ads.omnihero.pl`)
4. Dodaj rekordy DNS zgodnie z instrukcjami Firebase
5. Dodaj tę domenę do "Authorized domains" w Firebase Console

## 🔒 Bezpieczeństwo

### Obecne zabezpieczenia:
- ✅ Wymagane logowanie Google
- ✅ Ograniczenie do domeny @omnihero.pl (frontend)
- ✅ Protected routes - wymagana autentykacja
- ✅ Auto-wylogowanie przy zmianie stanu auth

### Opcjonalne dodatkowe zabezpieczenia (do rozważenia):

#### Backend Token Verification (Firebase Functions)

Możesz dodać middleware do backendu aby weryfikować tokeny:

```typescript
// functions/src/middleware/auth.ts
import { auth } from 'firebase-admin'

export async function verifyAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.split('Bearer ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  try {
    const decodedToken = await auth().verifyIdToken(token)
    
    // Check domain
    if (!decodedToken.email?.endsWith('@omnihero.pl')) {
      return res.status(403).json({ error: 'Access restricted to @omnihero.pl' })
    }
    
    req.user = decodedToken
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

#### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only allow authenticated users from @omnihero.pl
    function isAuthorized() {
      return request.auth != null 
        && request.auth.token.email.matches('.*@omnihero.pl$');
    }
    
    match /{document=**} {
      allow read, write: if isAuthorized();
    }
  }
}
```

## 📝 Notatki

- Tokeny Firebase wygasają po 1 godzinie - automatyczne odświeżanie jest obsługiwane przez SDK
- Logout jest dostępny w sidebar (na dole, pod nawigacją)
- Użytkownik widzi swoje zdjęcie profilowe, nazwę i email w sidebar

## 🐛 Troubleshooting

### Problem: "This app isn't verified"
- **Przyczyna:** Aplikacja w trybie testowym
- **Rozwiązanie:** Kliknij "Advanced" → "Go to [App name]" lub opublikuj aplikację w Google Cloud Console

### Problem: "Redirect URI mismatch"
- **Przyczyna:** Domena nie jest w authorized domains
- **Rozwiązanie:** Dodaj domenę w Firebase Console → Authentication → Settings → Authorized domains

### Problem: User się loguje ale jest od razu wylogowywany
- **Przyczyna:** Email nie kończy się na @omnihero.pl
- **Rozwiązanie:** Zaloguj się kontem firmowym

## ✅ Checklist przed oddaniem do testów

- [ ] Google Sign-In włączony w Firebase Console
- [ ] Authorized domains skonfigurowane
- [ ] Aplikacja zdeployowana (Firebase Hosting lub inna)
- [ ] Przetestowane logowanie kontem @omnihero.pl
- [ ] Przetestowane odrzucenie konta spoza domeny
- [ ] Wylogowanie działa poprawnie

