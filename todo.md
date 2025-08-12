# Gastroo.space - Lista Zadań 🚀

---

### Faza 1: Strona Główna i System Uwierzytelniania

- [ ] **Stworzenie Strony Głównej (Landing Page)**
    - [ ] Zaprojektować i zaimplementować komponent **Navbar**.
    - [ ] Zbudować komponent **Hero Section**.
    - [ ] Stworzyć sekcję **Oferta/Cennik**.
    - [ ] Zbudować komponent **Footer**.
    - [ ] Zapewnić pełną responsywność (RWD).

- [ ] **Zbudowanie Interaktywnego Trybu "Demo"**
    - [ ] Przygotować plik z fałszywymi danymi (mock data) w JSON.
    - [ ] Skonfigurować menedżer stanu (np. Zustand) dla trybu demo.
    - [ ] Zbudować UI panelu demo.
    - [ ] Zaimplementować akcje modyfikujące tylko stan lokalny.
    - [ ] Dodać synchronizację stanu dema z `localStorage`.
    - [ ] Dodać przycisk "Resetuj Demo".

- [ ] **Implementacja Systemu Logowania**
    - [ ] Stworzyć stronę `/login` z przyciskiem logowania Google.
    - [ ] Stworzyć globalny **AuthProvider** (React Context).
    - [ ] Zaimplementować logikę w hooku **useAuth** (`signInWithRedirect`, `signOut`).
    - [ ] Użyć `onAuthStateChanged` do globalnego śledzenia statusu użytkownika.
    - [ ] Zapisywać dane nowego użytkownika w kolekcji `users` w Firestore.

- [ ] **Stworzenie Panelu Głównego i Ochrona Tras**
    - [ ] Stworzyć stronę `/dashboard` jako główny widok.
    - [ ] Zaimplementować logikę sprawdzającą status zalogowania.
    - [ ] W przypadku braku logowania, przekierować z `/dashboard` na `/login`.
    - [ ] W panelu wyświetlić dane użytkownika i przycisk wylogowania.

---

### Faza 2: Pakiet "WIDOCZNOŚĆ"

- [ ] **Integracja z Google Business Profile API**
    - [ ] **Backend:** Stworzyć funkcję w Firebase dla callbacku OAuth 2.0.
    - [ ] **Backend:** Zaimplementować wymianę kodu na tokeny (`access_token`, `refresh_token`).
    - [ ] **Backend:** Zaimplementować bezpieczne zapisywanie tokenów w Firestore.
    - [ ] **Frontend:** Stworzyć przycisk "Połącz z Google".
    - [ ] **Backend:** Stworzyć funkcję `updateBusinessInfo` do akcji na API Google.
    - [ ] **Frontend:** Zbudować formularz w panelu do wywoływania funkcji `updateBusinessInfo`.

---

### Backlog i Ulepszenia

- [ ] Zaplanować granularne zadania dla Pakietu "Rezerwacje".
- [ ] Zaplanować granularne zadania dla Pakietu "Cyfrowe Menu QR".
- [ ] Zaplanować granularne zadania dla Pakietu "Zespół".
- [ ] Zoptymalizować zapytania do Firestore po zakończeniu MVP.
- [ ] Monitorować zależności i uruchamiać `npm update`, aby rozwiązać ewentualne ostrzeżenia.