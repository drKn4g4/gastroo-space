# CLAUDE.md — gastroo.space (Master AI AI-Instructions)

Poniższy dokument stanowi absolutną i kompletną bazę wiedzy dla agentów AI pracujących przy tym projekcie (wliczając wiedzę z `AGENTS`, `TOKENS`, i całego drzewa `docs/`). Oczekuje się natychmiastowego stosowania do tych rygorów.

---

## 1. 🔄 Workflow & Sprinty (KRYTYCZNE)
### Aktualizowanie Postępów (CHANGELOG.md & Backlog)
Jako asystent AI pracujący w tym środowisku, każda Twoja interakcja techniczna i modyfikacja bazy kodu musi być traktowana jako "Sprint". 
- Po wykonaniu kluczowych poleceń, refaktoryzacji baz danych, lub zakodowaniu feature'ów masz **obowiązek** udać się do `CHANGELOG.md` na głównym poziomie repozytorium i zaktualizować tam listę zrealizowanych zadań z informacją co, jak i dlaczego dodałeś w danej sesji (z podziałem na np. "Sprint 5: Zmiany w UI i Testy CSS").
- Obowiązkowo powiel i aktualizuj także listę nadchodzących zadań (Backlog) np. w plikach z katalogu `docs/ai/audit-fixes-todo.md`.

### Systematyzowanie Commitów 
Podczas zapisywania kodu do Git należy trzymać się notacji (np. Conventional Commits):
- `feat:` nowa funkcjonalność.
- `fix:` poprawka.
- `chore:` modyfikacja narzędzi deweloperskich, konfiguracji lub plików `docs/*` / `CLAUDE.md`.
- `refactor:` przepisywanie logiki, wyrzucanie hardkodowanych px. 
**Opis commita musi podsumowywać w 5-6 słowach zakres zmienionego kodu.**

---

## 2. 🚀 Środowisko: Deploys & Emulatory

### Praca Lokacyjna (Emulatory i Seedy)
Aplikacja jest silnie Env-Driven. Należy uruchamiać ją zawsze przez emulatory, dbając o odseparowane środowisko danych:
- Odpal emulatory + server Next.js: `npm run dev:start` (komenda uruchamia m.in. flagę `START_DEV_USE_APPHOSTING`).
- Obowiązkowo po starcie wypełniaj bazę (Seed) atrapą danych za pomocą: `npm run seed:unified`. Generuje ona predefiniowane uprawnienia: Organizacje, Właściciela (test-owner) i logi. Wszelkie API testuj właśnie na tych kontach (odnosząc się ustrukturyzowaniem zapisu do np. `orgId`).

### Systematic Deploy do Firebase
Gdy Agent upewni się, że kod przeszedł przez testy i weryfikację flag środowiskowych:
- Skrypty deploymentowe korzystają z profili `config/feature-flags/*` (dev, stage, prod).
- Używaj skryptu podanego pod `npm run deploy:firebase` lub polegaj na App Hostingu i wrzucaniu push'ów konwencjonalnych na branch. Unikaj niekontrolowanego `firebase deploy --only functions` z palca bez aktualizacji CHANGELOGU.

---

## 3. 🛡️ Baza i Autoryzacja (Multi-Tenancy)

### Reguła Złotego Organizatora
**Zakaz globalnych odpytań (Zero cross-org queries).**
- Baza danych (Firestore) działa w architekturze współdzielonej. Każde odczytanie i zapis do bazy MUSI precyzyjnie zaczynać się od rootowanej ścieżki organizacji: `organizations/{orgId}/restaurants/{restaurantId}/...`. 
- Niejawne zagnieżdżanie kolekcji globalnych to potencjalny wyciek B2B, który grozi zwolnieniem.
- Wszystkie API endpoints (`/api/*`) muszą być zabezpieczone wrapperem autoryzacyjnym `withAuth` oraz nakładkami na Role `requirePermission(context, 'nazwa.uprawnienia')`.

---

## 4. 🎨 CSS i Tokeny (Rygor "No-PX")

Jedno z najbardziej restrykcyjnych przykazań w `gastroo.space`: **W UI kodu wewnątrz `src/` zabrania się twardego kodowania jednostek `px`.** Wyjątkiem są border-width czy z góry przemyślane małe tricki media-query - poza tym to twarda blokada (weryfikowana skryptem `npm run lint:px`).

### Podział Złoty CSS:
1. **Zastosowanie Systemu UI (General Platform)**
   Zastępowane importem z `src/styles/units.ts`. Zamiast pisać height 16px, używaj `vh(16)`, zamiast szerokości 300px, pisz `vw(300)` lub `vmin()`. Pod maską liczą się one na podstawie bazowej mapy ekranu 768x1024px, co wymusza pełne fluid spacing.
2. **Zastosowanie Systemu T (Aplikacja Point of Sale, PIN-numery)**
   Tam gdzie UX wymaga precyzji w dotyku kelnera (mobilne POS'y, ekrany zamówień). Moduł oparty na pliku `pos.tokens.ts`. Przyciski i obszary muszą mieć zawsze objętość minimalną **>44px**. Tokenizuj z narzuconej logiki: `clamp(min, preferred, max)`.
3. Emotion: Nie powołuj innych css-in-js (jak styled-components). Projekt bazuje w pełni na natywnym potoku silnika **MUI** (`@mui/material`) z atrybutem `sx={...}`.

---

## 5. 🧪 Wytyczne Testów & NFR (Non-Functional) & PWA

- Testy jednostkowe / biznesowe odpalisz komendą `npx vitest run`. Uruchamia ona walidatory logiczne i pliki \`*.test.ts\` z backendu i domenowych interfejsów (np. contract testy za pomocą helpersów seedowania `npm run test:seed:contracts`).
- Aplikacja ma działać offline bez zgubienia pracy kelnera. Endpointy `GET` mają strategię `NetworkFirst`, natomiast **`POST /api/*` koniecznie opiera się o Service Worker'a i jest odkładany na "Background Sync Queue"** jeżeli pracownik traci zasięg w piwnicy lokalu.
- Kryteria wydajnościowe API: p95 wynoszące **nie więcej niż 800ms**. CLS (Cumulative Layout Shift) UI niepływający powyżej **0.1**.

---

## 📅 Roadmapa i Odpowiedzialność
Twoim obowiązkiem jest:
- Czytać instrukcje przed modyfikowaniem starych stylów (pamiętaj o `no px`).
- Rejestrować każdą głęboką ewolucję bazy w `CHANGELOG.md` i dokumentacji w `docs/ai/` na zasadzie sprintów.
- Być bezwzględnym względem izolowania danych po ID Organizacji `orgId`.
