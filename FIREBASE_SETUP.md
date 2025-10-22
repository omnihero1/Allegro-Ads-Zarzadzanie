# Firebase Setup

Aby używać Firestore w backendzie, musisz skonfigurować Firebase:

## 1. Utwórz projekt Firebase
1. Idź do https://console.firebase.google.com/
2. Kliknij "Add project"
3. Podaj nazwę projektu (np. "allegro-ads-dashboard")
4. Włącz Firestore Database

## 2. Wygeneruj Service Account Key
1. W Firebase Console, idź do Project Settings (⚙️)
2. Zakładka "Service accounts"
3. Kliknij "Generate new private key"
4. Pobierz plik JSON

## 3. Skonfiguruj zmienne środowiskowe
Dodaj do pliku `.env` w folderze `allegro-ads-backend/`:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

Wartości znajdziesz w pobranym pliku JSON:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`  
- `private_key` → `FIREBASE_PRIVATE_KEY`

## 4. Zrestartuj backend
```bash
cd allegro-ads-backend
npm run dev
```

## 5. Test
Po autoryzacji Allegro, dane konta będą zapisane w Firestore w kolekcji `accounts`.
