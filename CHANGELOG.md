# Changelog

Wszystkie znaczące zmiany w projekcie będą dokumentowane w tym pliku.

---

## [1.0.0] - 2024-10-21

### ✨ Dodane

#### Autoryzacja i konta
- OAuth 2.0 Device Flow dla autoryzacji kont Allegro
- Wyświetlanie listy podłączonych kont
- Manualne odświeżanie tokenów dla kont
- Automatyczne odświeżanie tokenów co 10 minut (30 min przed wygaśnięciem)
- Status konta (active/error) z automatyczną aktualizacją

#### Panel Allegro Ads
- Strona "Allegro Ads" w sidebar do zarządzania kampaniami
- Wybór konta Allegro z dropdown
- Wybór zakresu dat dla statystyk (max 7 dni)
- Przycisk "Załaduj dane" do pobierania danych

#### Kampanie
- Tabela z listą kampanii (Sponsored Offers)
- Wyświetlanie nazwy, statusu, marketplace
- Zmiana statusu kampanii (ACTIVE/PAUSED)
- Kliknięcie w kampanię filtruje grupy reklam

#### Grupy reklam
- Tabela z listą grup reklam
- Podstawowe dane: nazwa, status, okres wyświetlania
- Budżety: dzienny i całkowity
- Max CPC (Cost Per Click)
- Miejsca docelowe (placements)
- Zmiana statusu grupy reklam
- Kliknięcie w grupę wyświetla oferty

#### Metryki i statystyki
- Wyświetlenia (views)
- Kliknięcia (clicks)
- CTR - Click-Through Rate (%)
- Koszt całkowity
- Średnie CPC
- Sprzedaż
- ROAS - Return on Ad Spend (%)
- Agregacja metryk z wybranego okresu

#### Oferty
- Tabela z ofertami w wybranej grupie reklam
- Miniaturka zdjęcia oferty
- ID, nazwa, kategoria, cena
- Status możliwości reklamowania (advertisable)

#### Backend API
- `/auth/allegro/device/start` - rozpoczęcie Device Flow
- `/auth/allegro/device/poll` - sprawdzanie statusu autoryzacji
- `/auth/allegro/refresh` - odświeżanie tokena
- `/auth/allegro/accounts` - lista kont
- `/ads/campaigns` - lista kampanii
- `/ads/campaigns/:id` - szczegóły kampanii
- `/ads/adgroups` - lista grup reklam
- `/ads/adgroups/:id/statistics` - statystyki grupy
- `/ads/offers` - lista ofert

#### Persistence
- Integracja z Firebase Firestore
- Kolekcja `accounts` do przechowywania tokenów
- Automatyczne zapisywanie danych użytkownika przy autoryzacji

#### Dokumentacja
- README.md - główna dokumentacja projektu
- QUICK_START.md - szybki start w 5 minut
- ALLEGRO_API_GUIDE.md - przewodnik po API Allegro
- FIREBASE_SETUP.md - konfiguracja Firebase
- IMPLEMENTATION_SUMMARY.md - podsumowanie implementacji
- CHANGELOG.md - ten plik
- env.example - przykładowe pliki .env

### 🔧 Techniczne

#### Frontend
- React 18 + TypeScript
- Vite jako bundler
- React Router dla routingu
- Axios dla HTTP requests
- Firebase SDK dla Firestore

#### Backend
- Node.js + Express
- TypeScript
- Firebase Admin SDK
- Axios dla Allegro API
- Cookie-session dla PKCE state

#### Styling
- CSS modules
- Responsive design
- Status badges z kolorami
- Interaktywne tabele
- Loading states i error messages

### 🐛 Naprawione
- Problem z mixed content na stronie Allegro (rozpoznany jako zewnętrzny)
- Błąd `invalid_scope` - poprawiono scope na `allegro:api:ads allegro:api:campaigns`
- Problem z PKCE w Authorization Code Flow - przejście na Device Flow
- Firestore PERMISSION_DENIED - instrukcja włączenia API

### 🔒 Bezpieczeństwo
- Tokeny przechowywane w Firestore (nie w localStorage)
- CORS skonfigurowany dla localhost
- Environment variables dla sekretów
- .gitignore dla .env
- Automatyczne odświeżanie tokenów minimalizuje okno ataku

---

## [Planowane] - Przyszłe wersje

### 2.0.0 - Zaawansowane zarządzanie
- [ ] Display & Video Ads support
- [ ] Edycja budżetów inline
- [ ] Masowe operacje na kampaniach
- [ ] Archiwizacja kampanii

### 2.1.0 - Analityka
- [ ] Wykresy trendów
- [ ] Porównanie okresów
- [ ] Export do CSV/Excel
- [ ] Automatyczne raporty

### 2.2.0 - Optymalizacja
- [ ] Sugestie optymalizacji stawek
- [ ] Alerty przy przekroczeniu budżetu
- [ ] Automatyczna pauza przy niskim ROAS

### 3.0.0 - Enterprise
- [ ] Multi-user support
- [ ] Role-based access control
- [ ] Team management
- [ ] Audit logs

---

## Format

Ten changelog używa formatu opartego na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
i projekt stosuje [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Typy zmian
- **Dodane** - nowe funkcjonalności
- **Zmienione** - zmiany w istniejących funkcjonalnościach
- **Przestarzałe** - funkcjonalności do usunięcia w przyszłości
- **Usunięte** - usunięte funkcjonalności
- **Naprawione** - poprawki błędów
- **Bezpieczeństwo** - zmiany związane z bezpieczeństwem

