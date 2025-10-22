# Allegro Ads - Panel Zarządzania Kampaniami

Panel do zarządzania kampaniami reklamowymi w Allegro Ads z integracją API Allegro.

## 🚀 Funkcjonalności

### ✅ Zaimplementowane

#### 1. **Integracje**
- ✅ Autoryzacja kont Allegro Ads (Device Flow OAuth 2.0)
- ✅ Zarządzanie wieloma kontami Allegro
- ✅ Automatyczne odświeżanie tokenów co 10 minut (przed wygaśnięciem)
- ✅ Manualne odświeżanie tokenów
- ✅ Przechowywanie danych w Firebase Firestore

#### 2. **Allegro Ads - Zarządzanie Kampaniami**
- ✅ Wybór konta Allegro do zarządzania
- ✅ Wybór klienta agencyjnego z pełną listą (z paginacją - obsługa 100+ klientów)
- ✅ Wyszukiwanie klientów agencyjnych (filtrowanie po nazwie lub ID)
- ✅ Wybór zakresu dat dla statystyk (ostatnie 7 dni)
- ✅ Przeglądanie kampanii (Sponsored Offers)
- ✅ Przeglądanie grup reklam z pełnymi metrykami
- ✅ Przeglądanie ofert w grupach reklam
- ✅ Zmiana statusu kampanii (ACTIVE/PAUSED)
- ✅ Zmiana statusu grup reklam (ACTIVE/PAUSED)
- ✅ **Tworzenie nowych kampanii i grup reklam** - Wizard 3-krokowy
  - Krok 1: Wybór istniejącej kampanii LUB utworzenie nowej
  - Krok 2: Konfiguracja grupy reklam (budżety, Max CPC, miejsca docelowe, daty)
  - Krok 3: Wybór ofert do promowania
- ✅ Edycja nazw kampanii i grup reklam
- ✅ Edycja budżetów dziennych i całkowitych
- ✅ Edycja Max CPC
- ✅ Edycja miejsc docelowych (placements)
- ✅ Edycja okresu emisji (start/end date)
- ✅ Dodawanie/usuwanie ofert z grup reklam

#### 3. **Metryki i statystyki**
Dla każdej grupy reklam wyświetlane są:
- **Wyświetlenia** - liczba wyświetleń reklam
- **Kliknięcia** - liczba kliknięć w reklamy
- **CTR (%)** - współczynnik klikalności
- **Koszt** - całkowity koszt kampanii
- **Średnie CPC** - średni koszt za kliknięcie
- **Sprzedaż** - wartość sprzedaży z reklam
- **ROAS (%)** - zwrot z wydatków na reklamę

## 📁 Struktura projektu

```
/
├── allegro-ads-dashboard/          # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── Dashboard.tsx       # Strona główna
│   │   │   ├── AllegroAds.tsx      # Zarządzanie kampaniami
│   │   │   ├── Integrations.tsx    # Autoryzacja kont
│   │   │   ├── RootLayout.tsx      # Layout z sidebar
│   │   │   └── AllegroCallback.tsx # OAuth callback
│   │   ├── services/
│   │   │   ├── allegroAuth.ts      # Serwis autoryzacji
│   │   │   ├── allegroCampaigns.ts # Serwis kampanii
│   │   │   └── deviceFlow.ts       # Serwis Device Flow
│   │   └── firebase.ts             # Konfiguracja Firebase
│   └── package.json
│
└── allegro-ads-backend/            # Backend (Node.js + Express + TypeScript)
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts             # OAuth endpointy
    │   │   └── ads.ts              # API kampanii
    │   ├── services/
    │   │   └── tokenRefresh.ts     # Automatyczne odświeżanie tokenów
    │   ├── firebase.ts             # Firebase Admin SDK
    │   └── index.ts                # Główny plik serwera
    ├── .env                        # Zmienne środowiskowe
    └── package.json
```

## 🛠️ Instalacja

### Wymagania
- Node.js 18+
- npm lub yarn
- Konto Firebase (Firestore)
- Aplikacja Allegro (Client ID i Client Secret)

### 1. Klonowanie repozytorium
```bash
cd "Allegro Ads - zarządzanie kampaniami"
```

### 2. Backend - Instalacja

```bash
cd allegro-ads-backend
npm install
```

### 3. Backend - Konfiguracja `.env`

Utwórz plik `.env` w katalogu `allegro-ads-backend`:

```env
# Server
PORT=4000
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=your-secret-key-change-me

# Allegro API
ALLEGRO_CLIENT_ID=your-client-id
ALLEGRO_CLIENT_SECRET=your-client-secret
ALLEGRO_REDIRECT_URI=http://localhost:5173/integrations/allegro/callback
ALLEGRO_AUTH_URL=https://allegro.pl/auth/oauth
ALLEGRO_TOKEN_URL=https://allegro.pl/auth/oauth/token
ALLEGRO_API_URL=https://api.allegro.pl
ALLEGRO_SCOPE=allegro:api:ads allegro:api:campaigns
ALLEGRO_PROMPT=confirm

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Firebase - Konfiguracja

Przeczytaj `allegro-ads-backend/FIREBASE_SETUP.md` dla szczegółowych instrukcji.

Krótko:
1. Utwórz projekt Firebase
2. Włącz Firestore Database
3. Wygeneruj Service Account Key
4. Dodaj zmienne do `.env`

### 5. Frontend - Instalacja

```bash
cd allegro-ads-dashboard
npm install
```

### 6. Frontend - Konfiguracja `.env`

Utwórz plik `.env` w katalogu `allegro-ads-dashboard`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

## ▶️ Uruchomienie

### Backend
```bash
cd allegro-ads-backend
npm run dev
```

Backend uruchomi się na `http://localhost:4000`

### Frontend
```bash
cd allegro-ads-dashboard
npm run dev
```

Frontend uruchomi się na `http://localhost:5173`

## 📖 Jak używać

### 1. Autoryzacja konta Allegro
1. Otwórz aplikację i przejdź do **Integracje**
2. Kliknij **Połącz z Allegro Ads**
3. Skopiuj kod użytkownika i przejdź do podanego URL
4. Zaloguj się na konto Allegro i wprowadź kod
5. Po autoryzacji konto pojawi się na liście

### 2. Przeglądanie kampanii
1. Przejdź do **Allegro Ads**
2. Wybierz konto z listy
3. Ustaw zakres dat (max 7 dni wstecz)
4. Kliknij **Załaduj dane**
5. Przeglądaj kampanie, grupy reklam i oferty

### 3. Zarządzanie kampaniami
- Kliknij na kampanię, aby zobaczyć jej grupy reklam
- Kliknij na grupę reklam, aby zobaczyć oferty
- Zmień status kampanii/grupy reklam za pomocą rozwijanej listy
- Wszystkie metryki są automatycznie agregowane z wybranego okresu

## 🔧 API Endpointy

### Backend - Auth
- `POST /auth/allegro/device/start` - Rozpocznij Device Flow
- `POST /auth/allegro/device/poll` - Sprawdź status autoryzacji
- `POST /auth/allegro/refresh` - Odśwież token dla konta
- `GET /auth/allegro/accounts` - Pobierz listę kont

### Backend - Ads
- `GET /ads/clients` - Pobierz klientów agencji (z paginacją)
- `GET /ads/campaigns` - Pobierz kampanie
- `GET /ads/campaigns/:id` - Pobierz pojedynczą kampanię
- `PATCH /ads/campaigns/:id` - Aktualizuj kampanię
- `GET /ads/adgroups` - Pobierz grupy reklam
- `GET /ads/adgroups/:id` - Pobierz pojedynczą grupę reklam
- `PATCH /ads/adgroups/:id` - Aktualizuj grupę reklam
- `GET /ads/adgroups/:id/statistics` - Pobierz statystyki grupy
- `GET /ads/offers` - Pobierz oferty

## ⚠️ Ograniczenia API Allegro

### Tworzenie kampanii
- ✅ **API wspiera tworzenie kampanii RAZEM z grupą reklam** w jednym zapytaniu POST
- ✅ W polu `campaign` można podać:
  - `{ campaignId: "..." }` - dla istniejącej kampanii
  - `{ name: "..." }` - dla nowej kampanii (tworzona automatycznie)
- ✅ **API wspiera:** Tworzenie kampanii+grupy, tworzenie grup reklam, edycję kampanii, edycję grup reklam

### Typy kampanii
- ✅ **Wspierane:** Sponsored Offers (oferty sponsorowane)
- ❌ **Nie wspierane przez API:** 
  - Kampanie graficzne (Display Ads)
  - Kampanie wideo (Video Ads)
  - Ads Express
  - Bestsellers

> **Uwaga:** Kampanie graficzne i wideo można zarządzać **tylko przez panel Allegro Ads** na allegro.pl. API Allegro nie udostępnia endpointów dla tych typów kampanii.

### Limity paginacji
- **Klienci agencji:** max 1000 na zapytanie (automatyczna paginacja w backendzie)
- **Kampanie:** max 1000 na zapytanie
- **Grupy reklam:** max 1000 na zapytanie
- **Oferty:** max 30 na zapytanie
- **Statystyki:** max 7 dni wstecz

## 🔐 Bezpieczeństwo

- ✅ Tokeny przechowywane bezpiecznie w Firestore
- ✅ Automatyczne odświeżanie tokenów przed wygaśnięciem
- ✅ CORS skonfigurowany dla localhost
- ✅ OAuth 2.0 Device Flow (bezpieczny dla aplikacji bez backend redirect)

## 📚 Technologie

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Axios
- Firebase SDK

### Backend
- Node.js
- Express
- TypeScript
- Firebase Admin SDK
- Axios

## 🐛 Troubleshooting

### Backend nie startuje
- Sprawdź czy port 4000 jest wolny: `lsof -i :4000`
- Sprawdź czy `.env` ma poprawne zmienne

### Firestore błędy
- Upewnij się, że Firestore API jest włączone w Firebase Console
- Sprawdź czy `FIREBASE_PRIVATE_KEY` ma prawidłowy format (z `\n`)

### Autoryzacja nie działa
- Sprawdź czy `ALLEGRO_CLIENT_ID` i `ALLEGRO_CLIENT_SECRET` są prawidłowe
- Sprawdź czy w Allegro Apps panel redirect URI to `http://localhost:5173/integrations/allegro/callback`

## 📝 Licencja

MIT

## 👨‍💻 Autor

Utworzone dla zarządzania kampaniami Allegro Ads

