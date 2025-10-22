# 🚀 Quick Start - Allegro Ads Dashboard

Szybki przewodnik po uruchomieniu projektu w 5 minut.

## Wymagania

- ✅ Node.js 18 lub wyższy
- ✅ npm
- ✅ Konto Firebase (darmowe)
- ✅ Aplikacja Allegro (Client ID + Secret)

---

## Krok 1: Firebase Setup (2 min)

1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. Kliknij **Add project**
3. Podaj nazwę projektu → **Create project**
4. Wybierz **Firestore Database** → **Create database** → **Production mode** → **Enable**
5. Przejdź do **⚙️ Project settings** → **Service accounts** → **Generate new private key**
6. Zapisz pobrany plik JSON

---

## Krok 2: Allegro App Setup (2 min)

1. Przejdź do [Allegro Apps](https://apps.developer.allegro.pl/)
2. Zaloguj się na konto Allegro
3. Kliknij **Create new app**
4. Wybierz **Device flow**
5. Scope: wybierz `allegro:api:ads` i `allegro:api:campaigns`
6. Zapisz **Client ID** i **Client Secret**

---

## Krok 3: Backend Setup (1 min)

```bash
cd "Allegro Ads - zarządzanie kampaniami/allegro-ads-backend"
npm install
```

Utwórz plik `.env`:
```env
PORT=4000
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=random-secret-key-123

ALLEGRO_CLIENT_ID=twój-client-id
ALLEGRO_CLIENT_SECRET=twój-client-secret
ALLEGRO_REDIRECT_URI=http://localhost:5173/integrations/allegro/callback
ALLEGRO_AUTH_URL=https://allegro.pl/auth/oauth
ALLEGRO_TOKEN_URL=https://allegro.pl/auth/oauth/token
ALLEGRO_API_URL=https://api.allegro.pl
ALLEGRO_SCOPE=allegro:api:ads allegro:api:campaigns
ALLEGRO_PROMPT=confirm

FIREBASE_PROJECT_ID=twój-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@twój-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntwój-klucz\n-----END PRIVATE KEY-----\n"
```

> 💡 **Tip**: Wartości Firebase znajdziesz w pobranym pliku JSON z kroku 1

Uruchom backend:
```bash
npm run dev
```

Powinieneś zobaczyć:
```
Backend listening on :4000
Token refresh service started - checking every 10 minutes
```

---

## Krok 4: Frontend Setup (30 sek)

```bash
cd "../allegro-ads-dashboard"
npm install
```

Utwórz plik `.env`:
```env
VITE_BACKEND_URL=http://localhost:4000
```

Uruchom frontend:
```bash
npm run dev
```

Aplikacja otworzy się na `http://localhost:5173`

---

## Krok 5: Pierwsze użycie

### 1. Autoryzuj konto Allegro
1. Kliknij **Integracje** w sidebar
2. Kliknij **Połącz z Allegro Ads**
3. Skopiuj kod użytkownika
4. Przejdź do podanego URL
5. Zaloguj się i wpisz kod
6. Po chwili konto pojawi się na liście ✅

### 2. Przeglądaj kampanie
1. Kliknij **Allegro Ads** w sidebar
2. Wybierz konto z listy
3. Ustaw zakres dat (max 7 dni)
4. Kliknij **Załaduj dane**
5. Zobacz kampanie, grupy reklam i statystyki 📊

---

## 🎉 Gotowe!

Aplikacja jest gotowa do użycia. Możesz teraz:

- ✅ Przeglądać kampanie i grupy reklam
- ✅ Zmieniać statusy (ACTIVE/PAUSED)
- ✅ Analizować metryki (CTR, ROAS, CPC)
- ✅ Przeglądać oferty w grupach reklam
- ✅ Tokeny odświeżają się automatycznie

---

## Troubleshooting

### ❌ Backend nie startuje
```bash
# Sprawdź czy port 4000 jest wolny
lsof -i :4000
# Jeśli jest zajęty, zmień PORT w .env
```

### ❌ Firestore błąd
1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Wybierz projekt
3. Włącz **Cloud Firestore API**
4. Zrestartuj backend

### ❌ Autoryzacja nie działa
- Sprawdź czy `ALLEGRO_CLIENT_ID` i `ALLEGRO_CLIENT_SECRET` są poprawne
- Sprawdź czy w Allegro Apps wybrano **Device flow**

---

## 📚 Dalsze kroki

- Przeczytaj [README.md](./README.md) - pełna dokumentacja
- Przeczytaj [ALLEGRO_API_GUIDE.md](./ALLEGRO_API_GUIDE.md) - dokumentacja API
- Przeczytaj [FIREBASE_SETUP.md](./allegro-ads-backend/FIREBASE_SETUP.md) - szczegóły Firebase

---

## 💬 Potrzebujesz pomocy?

Sprawdź logi:
```bash
# Backend logs
cd allegro-ads-backend
tail -f .server.log

# Frontend logs
# Otwórz Console w przeglądarce (F12)
```

---

**Miłego zarządzania kampaniami! 🚀**

