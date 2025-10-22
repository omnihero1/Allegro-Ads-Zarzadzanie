# Firebase Setup - Instrukcja konfiguracji

Ten dokument zawiera szczegółowe instrukcje konfiguracji Firebase Firestore dla projektu Allegro Ads.

## 1. Utwórz projekt Firebase

1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. Kliknij **Add project** (Dodaj projekt)
3. Podaj nazwę projektu (np. `allegro-ads-management`)
4. Wyłącz Google Analytics (opcjonalnie)
5. Kliknij **Create project**

## 2. Włącz Firestore Database

1. W lewym menu wybierz **Build** → **Firestore Database**
2. Kliknij **Create database**
3. Wybierz lokalizację (np. `europe-west3`)
4. Wybierz tryb **Production mode** (możesz też wybrać Test mode dla rozwoju)
5. Kliknij **Enable**

## 3. Skonfiguruj reguły Firestore (opcjonalnie)

W zakładce **Rules** możesz ustawić reguły bezpieczeństwa:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zezwól na dostęp tylko z backendu (Service Account)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Te reguły blokują bezpośredni dostęp z frontendu. Cały dostęp odbywa się przez backend z Firebase Admin SDK.

## 4. Wygeneruj Service Account Key

1. W lewym menu kliknij ikonę ⚙️ (Settings) → **Project settings**
2. Przejdź do zakładki **Service accounts**
3. Kliknij **Generate new private key**
4. Potwierdź kliknięciem **Generate key**
5. Pobierze się plik JSON z kluczem (np. `allegro-ads-management-firebase-adminsdk.json`)

## 5. Wyciągnij dane z Service Account Key

Otwórz pobrany plik JSON i znajdź następujące pola:

```json
{
  "type": "service_account",
  "project_id": "allegro-ads-management-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@allegro-ads-management-xxxxx.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

## 6. Dodaj zmienne do `.env`

Skopiuj następujące wartości do pliku `.env` w katalogu `allegro-ads-backend`:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=allegro-ads-management-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@allegro-ads-management-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w...\n-----END PRIVATE KEY-----\n"
```

### ⚠️ UWAGA: Private Key
- `FIREBASE_PRIVATE_KEY` musi być w cudzysłowie
- `\n` w kluczu muszą pozostać jako `\n` (nie zamieniaj na prawdziwe nowe linie)
- Cały klucz powinien być w jednej linii z `\n` jako separatorami

Przykład:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
```

## 7. Struktura kolekcji Firestore

Backend automatycznie utworzy następującą strukturę:

### Kolekcja `accounts`
Przechowuje autoryzowane konta Allegro:

```javascript
{
  id: string,              // ID użytkownika Allegro
  name: string,            // Nazwa użytkownika
  email: string,           // Email użytkownika
  status: string,          // 'active' | 'error'
  createdAt: string,       // ISO timestamp
  lastRefresh: string,     // ISO timestamp ostatniego odświeżenia
  tokens: {
    access_token: string,
    refresh_token: string,
    token_type: string,
    expires_in: number,
    scope: string
  }
}
```

## 8. Weryfikacja konfiguracji

Po uruchomieniu backendu:

```bash
cd allegro-ads-backend
npm run dev
```

Backend powinien wyświetlić:
```
Backend listening on :4000
Token refresh service started - checking every 10 minutes
```

Jeśli zobaczysz błąd `PERMISSION_DENIED: Cloud Firestore API has not been used`:
1. Przejdź do [Google Cloud Console](https://console.cloud.google.com/)
2. Wybierz projekt Firebase
3. Włącz **Cloud Firestore API**
4. Zrestartuj backend

## 9. Testowanie połączenia

Możesz przetestować połączenie z Firestore przez Firebase Console:
1. Przejdź do **Firestore Database**
2. Po autoryzacji pierwszego konta, powinna pojawić się kolekcja `accounts`
3. Kliknij na dokument, aby zobaczyć zapisane dane

## 10. Bezpieczeństwo

### ⚠️ NIGDY NIE COMMITUJ `.env`
Upewnij się, że `.env` jest w `.gitignore`:

```
# .gitignore
.env
*.log
node_modules/
```

### 🔒 Service Account Key
- Traktuj Service Account Key jak hasło
- Nie udostępniaj go publicznie
- Możesz go w dowolnym momencie odwołać w Firebase Console

### 🔑 Rotacja kluczy
Zalecamy rotację Service Account Key co kilka miesięcy:
1. Wygeneruj nowy klucz w Firebase Console
2. Zaktualizuj `.env`
3. Zrestartuj backend
4. Usuń stary klucz w Firebase Console

## Troubleshooting

### Błąd: `PERMISSION_DENIED`
**Rozwiązanie**: Włącz Cloud Firestore API w Google Cloud Console

### Błąd: `Invalid private key`
**Rozwiązanie**: Sprawdź czy `FIREBASE_PRIVATE_KEY` ma prawidłowy format z `\n`

### Błąd: `Project not found`
**Rozwiązanie**: Sprawdź czy `FIREBASE_PROJECT_ID` jest poprawny

### Firestore jest pusty
**Rozwiązanie**: Autoryzuj pierwsze konto Allegro w aplikacji - kolekcja zostanie utworzona automatycznie

## Dodatkowe zasoby

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Firestore Limits](https://firebase.google.com/docs/firestore/quotas)

