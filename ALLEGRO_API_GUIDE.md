# Allegro Ads API - Przewodnik

Ten dokument zawiera informacje o endpointach Allegro Ads API używanych w projekcie.

## 📚 Dokumentacja

Oficjalna dokumentacja: [https://developer.allegro.pl/docs/ads-management-api](https://developer.allegro.pl/docs/ads-management-api)

## 🔐 Autoryzacja

Projekt używa **OAuth 2.0 Device Flow** dla autoryzacji użytkowników.

### Wymagane scope'y:
- `allegro:api:ads` - dostęp do Allegro Ads API
- `allegro:api:campaigns` - zarządzanie kampaniami

## 📋 Endpointy używane w projekcie

### 0. Klienci agencji (Agency Clients)

#### GET /ads/clients
Pobiera listę klientów agencji reklamowej.

**Parametry:**
- `status` - Status współpracy: `ACTIVE`, `PENDING`, `INACTIVE` (domyślnie: `ACTIVE`)
- `limit` - Limit wyników (1-1000, domyślnie: 20)
- `offset` - Offset dla paginacji (0-9999999)

**Odpowiedź:**
```json
{
  "clients": [
    {
      "id": "033bd94b-1168-37e4-b0d6-44c3c95e35bf",
      "name": "ElectroShop",
      "type": "SINGLE_SELLER",
      "status": "ACTIVE"
    }
  ],
  "count": 20,
  "totalCount": 100
}
```

> **Ważne:** Backend automatycznie pobiera **wszystkich** klientów używając paginacji (limit=1000 na żądanie), więc frontend otrzymuje kompletną listę klientów.

### 1. Kampanie (Campaigns)

#### GET /ads/clients/{adsClientId}/sponsored/campaigns
Pobiera listę kampanii dla danego klienta.

**Parametry:**
- `marketplaceId` - ID rynku (np. `allegro-pl`)
- `status` - Status kampanii: `ACTIVE`, `PAUSED`, `ARCHIVED`

**Odpowiedź:**
```json
{
  "campaigns": [
    {
      "id": "261d684f-6b7d-3af9-96a5-691e7106075e",
      "marketplaceId": "allegro-pl",
      "name": "Mountain bikes",
      "status": "ACTIVE"
    }
  ],
  "count": 20,
  "totalCount": 23
}
```

#### POST /ads/clients/{adsClientId}/sponsored/campaigns
Tworzy nową kampanię.

**Body:**
```json
{
  "name": "Kampania wiosenna 2025",
  "status": "ACTIVE"
}
```

**Odpowiedź:**
```json
{
  "id": "c48e387d-ea48-38fa-bf35-382e71cb1996",
  "marketplaceId": "allegro-pl",
  "name": "Kampania wiosenna 2025",
  "status": "ACTIVE"
}
```

#### PATCH /ads/clients/{adsClientId}/sponsored/campaigns/{campaignId}
Modyfikuje kampanię.

**Body:**
```json
{
  "name": "New campaign name",
  "status": "ACTIVE" // lub "PAUSED"
}
```

### 2. Grupy reklam (Ad Groups)

#### GET /ads/clients/{adsClientId}/sponsored/adgroups
Pobiera listę grup reklam.

**Parametry:**
- `marketplaceId` - ID rynku
- `campaignId` - ID kampanii (opcjonalne)
- `status` - Status grupy

**Odpowiedź:**
```json
{
  "adGroups": [
    {
      "id": "261d684f-6b7d-3af9-96a5-691e7106075e",
      "campaignId": "c48e387d-ea48-38fa-bf35-382e71cb1996",
      "marketplaceId": "allegro-pl",
      "status": "ACTIVE",
      "bidding": {
        "maxCpc": {
          "amount": 9.25,
          "currency": "PLN"
        }
      },
      "name": "Downhill bikes",
      "display": {
        "start": "2025-05-01",
        "end": "2025-05-18"
      },
      "placements": {
        "ids": ["listing", "mainpage"]
      },
      "budget": {
        "daily": {
          "amount": 9.25,
          "currency": "PLN"
        },
        "total": {
          "amount": 9.25,
          "currency": "PLN"
        }
      },
      "offers": {
        "offerIds": ["12345678901", "12345678902"]
      }
    }
  ],
  "count": 20,
  "totalCount": 23
}
```

#### POST /ads/clients/{adsClientId}/sponsored/adgroups
Tworzy nową grupę reklam (opcjonalnie wraz z nową kampanią).

**Wariant 1: Dodaj do istniejącej kampanii**
```json
{
  "campaign": {
    "campaignId": "c48e387d-ea48-38fa-bf35-382e71cb1996"
  },
  "marketplaceId": "allegro-pl",
  "name": "Promocja rowery górskie",
  "status": "ACTIVE",
  "bidding": {
    "maxCpc": {
      "amount": "2.50",
      "currency": "PLN"
    }
  },
  "display": {
    "start": "2025-01-15",
    "end": "2025-02-15"
  },
  "placements": {
    "ids": ["listing", "mainpage"]
  },
  "budget": {
    "daily": {
      "amount": "50.00",
      "currency": "PLN"
    },
    "total": {
      "amount": "1000.00",
      "currency": "PLN"
    }
  },
  "offers": {
    "offerIds": ["12345678901", "12345678902"]
  }
}
```

**Wariant 2: Utwórz nową kampanię wraz z grupą**
```json
{
  "campaign": {
    "name": "Kampania wiosenna 2025"
  },
  "marketplaceId": "allegro-pl",
  "name": "Promocja rowery górskie",
  "status": "ACTIVE",
  "bidding": {
    "maxCpc": {
      "amount": "2.50",
      "currency": "PLN"
    }
  },
  "display": {
    "start": "2025-01-15",
    "end": "2025-02-15"
  },
  "placements": {
    "ids": ["listing", "mainpage"]
  },
  "budget": {
    "daily": {
      "amount": "50.00",
      "currency": "PLN"
    },
    "total": {
      "amount": "1000.00",
      "currency": "PLN"
    }
  },
  "offers": {
    "offerIds": ["12345678901", "12345678902"]
  }
}
```

**Odpowiedź:** Zwraca pełny obiekt grupy reklam (jak w GET). Kampania jest tworzona automatycznie jeśli podano `campaign.name`.

#### PATCH /ads/clients/{adsClientId}/sponsored/adgroups/{adGroupId}
Modyfikuje grupę reklam.

**Body (przykład - zmiana ofert):**
```json
{
  "offers": {
    "offerIds": ["12345678901", "12345678902"]
  }
}
```

**Body (przykład - zmiana budżetu):**
```json
{
  "budget": {
    "daily": {
      "amount": 50.00,
      "currency": "PLN"
    }
  }
}
```

**Body (przykład - zmiana statusu):**
```json
{
  "status": "PAUSED"
}
```

### 3. Statystyki grup reklam

#### GET /ads/sponsored/adgroups/{adGroupId}/statistics
Pobiera statystyki dla grupy reklam.

**Parametry:**
- `date.gte` - Data początkowa (format: `YYYY-MM-DD`)
- `date.lte` - Data końcowa (format: `YYYY-MM-DD`)
- Zakres: max 7 dni (od dzisiaj minus 6 dni do dzisiaj)

**Odpowiedź:**
```json
{
  "stats": [
    {
      "ad": {
        "name": "Downhill bikes",
        "offerId": 1234567890
      },
      "dailyStats": [
        {
          "date": "2021-01-01",
          "stats": {
            "interest": 100,
            "clicks": 100,
            "totalCost": {
              "amount": 9.25,
              "currency": "PLN"
            },
            "views": 100,
            "ctr": 0,
            "soldQuantity": 0,
            "sold": {
              "amount": 9.25,
              "currency": "PLN"
            },
            "averageCpc": {
              "amount": 9.25,
              "currency": "PLN"
            },
            "rateOfReturn": 0
          }
        }
      ]
    }
  ]
}
```

### 4. Oferty (Offers)

#### GET /ads/clients/{adsClientId}/sponsored/offers
Pobiera listę ofert klienta.

**Parametry:**
- `marketplaceId` - ID rynku
- `name` - Wyszukiwanie po nazwie oferty (opcjonalne)
- `category.id` - Filtrowanie po kategorii (opcjonalne)
- `price.amount.gte` - Minimalna cena (opcjonalne)
- `price.amount.lte` - Maksymalna cena (opcjonalne)
- `offset` - Offset wyników (0-60000)
- `limit` - Limit wyników (1-30)

**Odpowiedź:**
```json
{
  "offers": [
    {
      "id": 12974380291,
      "name": "Super product",
      "category": {
        "id": 256973
      },
      "price": {
        "amount": 9.25,
        "currency": "PLN"
      },
      "marketplaceId": "allegro-pl",
      "imageUrl": "https://example.com/image.jpg",
      "advertisable": true
    }
  ],
  "count": 20,
  "totalCount": 23
}
```

## 📊 Metryki wyjaśnienie

### Podstawowe metryki:
- **views** - Liczba wyświetleń reklamy
- **clicks** - Liczba kliknięć w reklamę
- **interest** - Liczba użytkowników zainteresowanych (np. dodali do obserwowanych)
- **totalCost** - Całkowity koszt kampanii
- **soldQuantity** - Liczba sprzedanych sztuk z reklam
- **sold** - Wartość sprzedaży z reklam

### Wskaźniki efektywności:
- **CTR (Click-Through Rate)** - Współczynnik klikalności = (clicks / views) * 100
- **averageCpc** - Średni koszt za kliknięcie = totalCost / clicks
- **ROAS (Return on Ad Spend)** - Zwrot z wydatków na reklamę = (sold / totalCost) * 100

### Budżety:
- **daily budget** - Dzienny limit wydatków
- **total budget** - Całkowity limit wydatków na kampanię
- **maxCpc** - Maksymalna stawka za kliknięcie (Cost Per Click)

## 🎯 Miejsca docelowe (Placements)

Możliwe wartości dla `placements.ids`:
- `listing` - Strona z wynikami wyszukiwania
- `mainpage` - Strona główna Allegro
- `offer` - Strona oferty
- `category` - Strona kategorii

## 🔄 Statusy

### Kampanie i grupy reklam:
- `ACTIVE` - Kampania/grupa aktywna, reklamy są emitowane
- `PAUSED` - Kampania/grupa wstrzymana, reklamy nie są emitowane
- `ARCHIVED` - Kampania/grupa zarchiwizowana (usunięta)

### Konta:
- `active` - Konto połączone i działające
- `error` - Problem z kontem (np. wygasły token)

## ⚠️ Limity API

- **Statystyki**: Maksymalny zakres dat to 7 dni (od dzisiaj minus 6 dni do dzisiaj)
- **Oferty**: Maksymalnie 30 ofert na zapytanie
- **Rate limiting**: Allegro może limitować liczbę zapytań

## 🛠️ Typy grup reklam

### Wspierane:
- ✅ Manually selected offers - "Wybierz oferty ręcznie"
- ✅ Rule-based selected offers - "Ustaw reguły dla ofert"

### Nie wspierane przez API:
- ❌ Bestsellers
- ❌ Advertise all offers
- ❌ Ads Express
- ❌ Listing form
- ❌ **Display and Video ads** (kampanie graficzne i wideo - dostępne tylko przez panel Allegro)

> **Uwaga:** Kampanie graficzne (Display ads) i wideo nie są dostępne przez API Allegro Ads. Można nimi zarządzać **tylko przez panel Allegro Ads** na stronie allegro.pl.

## 📝 Przykłady użycia

### Zmiana statusu kampanii z ACTIVE na PAUSED
```bash
curl -X PATCH \
  'https://api.allegro.pl/ads/clients/{adsClientId}/sponsored/campaigns/{campaignId}' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'Accept: application/vnd.allegro.beta.v1+json' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "PAUSED"
  }'
```

### Zmiana budżetu dziennego grupy reklam
```bash
curl -X PATCH \
  'https://api.allegro.pl/ads/clients/{adsClientId}/sponsored/adgroups/{adGroupId}' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'Accept: application/vnd.allegro.beta.v1+json' \
  -H 'Content-Type: application/json' \
  -d '{
    "budget": {
      "daily": {
        "amount": 100.00,
        "currency": "PLN"
      }
    }
  }'
```

### Pobranie statystyk za ostatnie 7 dni
```bash
curl -X GET \
  'https://api.allegro.pl/ads/sponsored/adgroups/{adGroupId}/statistics?date.gte=2025-10-14&date.lte=2025-10-21' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'Accept: application/vnd.allegro.beta.v1+json'
```

## 🔗 Linki

- [Allegro Developer Portal](https://developer.allegro.pl/)
- [Ads Management API Docs](https://developer.allegro.pl/docs/ads-management-api)
- [OAuth 2.0 Device Flow](https://developer.allegro.pl/tutorials/uwierzytelnianie-i-autoryzacja-zlq9e75GdIR#device-flow)
- [Allegro Apps Panel](https://apps.developer.allegro.pl/)

