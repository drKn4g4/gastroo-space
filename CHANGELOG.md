# Changelog

## [0.1.5] - 2026-03-26

### Changed
- Automated deploy release for production (gcp)
- CI run: 3, commit: 07932cf
## [0.1.4] - 2026-03-26

### Changed
- Automated deploy release for staging (gcp)
- CI run: 2, commit: 0fe8e37
## [0.1.3] - 2026-03-26

### Changed
- **CLAUDE.md**: Przepisany od zera — skonsolidowany z AGENTS.md jako single source of truth dla AI
- **AGENTS.md**: Usunięty (treść wchłonięta przez CLAUDE.md)
- **docs/ai/**: Usunięte stale session logi (SESSION_SUMMARY, IMPLEMENTATION_PROGRESS, QUICK_REFERENCE), zmergowane duplikaty, ujednolicone nazwy (api-reference.md, seed-data.md, backlog.md)
- **README.md**: Zaktualizowane referencje do nowej struktury dokumentacji

## [0.1.2] - 2026-03-17

### Changed

- Automated deploy release for staging (gcp)
- CI run: local, commit: local

## [0.1.1] - 2026-01-13

### Security
- **CRITICAL**: Fixed Firestore security rules - replaced permissive rules with authentication-based rules
- Added proper authentication checks for all database operations
- Implemented userId-based data ownership enforcement

### Added
- **PWA Support**: Full Progressive Web App implementation
  - Service worker with smart caching strategies
  - Web app manifest with multiple icon sizes (72px to 512px)
  - Offline fallback page
  - Install prompt component (InstallPWA)
  - Apple touch icon and favicon
  - PWA meta tags for iOS and Android
- ErrorBoundary component for graceful error handling
- NotificationProvider for user-friendly toast notifications
- Comprehensive error handling utilities with Firebase error mapping
- Form validation using Zod schemas
- Input sanitization (trim) for all text inputs
- Error state and validation messages in forms
- Security documentation (SECURITY.md)
- PWA documentation (PWA_GUIDE.md)

### Fixed
- TypeScript error in BookingCalendarView (undefined `locale` variable)
- Fixed date-fns locale imports and usage
- GbpConnector now properly implements connection flow with loading states
- Dashboard page properly handles GbpConnector state
- Removed all test data and hardcoded values from components
- Better error messages instead of alert() calls

### Changed
- Updated .gitignore to exclude Firebase build artifacts and generated files
- ManualBookingForm now uses empty initial state instead of test data
- BookingCalendarView uses only real Firestore data (removed TEST_BOOKINGS fallback)
- All forms now validate input before submission
- Improved error handling with proper logging and user feedback

### Improved
- User experience with Snackbar notifications instead of browser alerts
- Form validation with real-time error feedback
- Error boundary shows helpful messages in development mode
- GbpConnector UI with loading states and connection feedback

## [0.1.0] - 2025-08-12

### Initial Release
- Next.js 15 + React 19 + TypeScript setup
- Firebase integration (Auth, Firestore, Hosting, Functions)
- Multi-language support (Polish, English)
- Material-UI theming
- Authentication with Google OAuth
- Manual booking form
- Booking calendar view
- Google Business Profile connector (demo)
- PWA support
- Genkit AI integration setup
