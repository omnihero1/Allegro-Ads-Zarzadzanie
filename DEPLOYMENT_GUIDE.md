# 🚀 Deployment Guide - Firebase Hosting

## Wymagania wstępne

- ✅ Firebase CLI zainstalowane (`npm install -g firebase-tools`)
- ✅ Konto Google z dostępem do projektu Firebase
- ✅ Projekt Firebase: `allegro-ads-management-fe724`

## 📋 Kroki deployment

### 1. **Zaloguj się do Firebase** (tylko raz)

```bash
firebase login
```

To otworzy przeglądarkę - zaloguj się kontem Google, które ma dostęp do projektu Firebase.

### 2. **Zbuduj aplikację frontend**

```bash
cd allegro-ads-dashboard
npm run build
```

To utworzy folder `dist` z zbudowaną aplikacją.

### 3. **Deploy do Firebase Hosting**

```bash
cd ..  # wróć do głównego katalogu projektu
firebase deploy --only hosting
```

**Alternatywnie**, deploy wszystkiego (hosting + functions + firestore rules):

```bash
firebase deploy
```

### 4. **Sprawdź deployment**

Po zakończeniu zobaczysz URL, np.:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/allegro-ads-management-fe724/overview
Hosting URL: https://allegro-ads-management-fe724.web.app
```

Otwórz URL w przeglądarce!

---

## 🔧 Konfiguracja (już zrobiona)

### `firebase.json`
```json
{
  "hosting": {
    "public": "allegro-ads-dashboard/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**Co to robi:**
- `public`: Wskazuje folder z zbudowaną aplikacją
- `rewrites`: Wszystkie ścieżki przekierowuje do `index.html` (dla React Router)
- `headers`: Dodaje cache dla statycznych plików (1 rok)

---

## ⚠️ Ważne - Po pierwszym deployment

### 1. **Dodaj domenę do Firebase Auth**

Firebase Authentication → Settings → Authorized domains

Dodaj:
- `allegro-ads-management-fe724.web.app`
- `allegro-ads-management-fe724.firebaseapp.com`

**Bez tego Google Sign-In NIE BĘDZIE DZIAŁAĆ!**

### 2. **Włącz Google Sign-In** (jeśli nie zrobione)

Firebase Console → Authentication → Sign-in method → Google → Enable

---

## 🔄 Kolejne deploymenty

Po każdej zmianie w kodzie:

```bash
# 1. Zbuduj frontend
cd allegro-ads-dashboard
npm run build

# 2. Deploy
cd ..
firebase deploy --only hosting
```

**Szybszy deployment** (tylko hosting, bez rebuildu functions):
```bash
firebase deploy --only hosting
```

---

## 🌐 Własna domena (opcjonalnie)

### Jeśli chcesz używać własnej domeny (np. `ads.omnihero.pl`):

1. **Firebase Console** → Hosting → Add custom domain
2. Wpisz domenę: `ads.omnihero.pl`
3. Firebase poda Ci rekordy DNS do dodania:
   ```
   Type: A
   Name: ads
   Value: 151.101.1.195, 151.101.65.195
   ```
4. Dodaj te rekordy w panelu DNS swojej domeny
5. Poczekaj 24-48h na propagację DNS
6. Firebase automatycznie skonfiguruje SSL (HTTPS)

**Pamiętaj:** Po dodaniu własnej domeny, dodaj ją też do "Authorized domains" w Firebase Auth!

---

## 📊 Monitoring

### Sprawdź logi deployment:
```bash
firebase hosting:channel:list
```

### Sprawdź użycie:
```bash
firebase projects:list
```

### Console Firebase:
https://console.firebase.google.com/project/allegro-ads-management-fe724/hosting

---

## 🐛 Troubleshooting

### Problem: "Authentication Error"
**Rozwiązanie:**
```bash
firebase logout
firebase login
```

### Problem: "Build nie istnieje"
**Rozwiązanie:**
```bash
cd allegro-ads-dashboard
npm run build
cd ..
firebase deploy --only hosting
```

### Problem: "Google Sign-In nie działa"
**Przyczyna:** Domena nie jest w "Authorized domains"
**Rozwiązanie:** Dodaj domenę w Firebase Console → Authentication → Settings → Authorized domains

### Problem: "404 na podstronach po odświeżeniu"
**Przyczyna:** Brak rewrites w `firebase.json`
**Rozwiązanie:** Już dodane! Rewrites przekierowuje wszystkie ścieżki do `index.html`.

---

## 📝 Checklist przed deployment

- [ ] Zbudowana aplikacja (`npm run build` w `allegro-ads-dashboard/`)
- [ ] Zalogowany do Firebase (`firebase login`)
- [ ] Sprawdzone zmienne środowiskowe w `.env`
- [ ] Przetestowane lokalnie (`npm run dev`)
- [ ] Wszystkie zmiany scommitowane do Git

---

## 🎯 Quick Commands

```bash
# Deployment z buildem
cd allegro-ads-dashboard && npm run build && cd .. && firebase deploy --only hosting

# Deployment wszystkiego (hosting + functions + firestore)
firebase deploy

# Tylko functions
firebase deploy --only functions

# Tylko firestore rules
firebase deploy --only firestore:rules

# Preview (staging)
firebase hosting:channel:deploy preview

# Rollback do poprzedniej wersji
firebase hosting:rollback
```

---

## 🔐 Security

### Firestore Security Rules dla domeny @omnihero.pl

W pliku `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
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

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## ✅ Po deployment

1. Otwórz URL aplikacji
2. Sprawdź czy Google Sign-In działa
3. Sprawdź czy routing działa (odśwież podstronę)
4. Sprawdź czy logo się wyświetla
5. Sprawdź console w przeglądarce (czy nie ma błędów)

**Twój URL:** https://allegro-ads-management-fe724.web.app 🎉

