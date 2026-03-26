import { FirebaseError } from 'firebase/app';

export interface AppError {
    message: string;
    code?: string;
    details?: string;
}

export function handleFirebaseError(error: unknown): AppError {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case 'permission-denied':
                return {
                    message: 'Nie masz uprawnień do wykonania tej operacji.',
                    code: error.code,
                    details: 'Sprawdź, czy jesteś zalogowany i masz odpowiednie uprawnienia.',
                };
            case 'not-found':
                return {
                    message: 'Nie znaleziono żądanych danych.',
                    code: error.code,
                };
            case 'already-exists':
                return {
                    message: 'Zasób już istnieje.',
                    code: error.code,
                };
            case 'unauthenticated':
                return {
                    message: 'Musisz być zalogowany, aby wykonać tę operację.',
                    code: error.code,
                };
            case 'unavailable':
                return {
                    message: 'Serwis tymczasowo niedostępny. Spróbuj ponownie za chwilę.',
                    code: error.code,
                };
            default:
                return {
                    message: 'Wystąpił błąd Firebase.',
                    code: error.code,
                    details: error.message,
                };
        }
    }

    if (error instanceof Error) {
        return {
            message: error.message || 'Wystąpił nieoczekiwany błąd.',
        };
    }

    return {
        message: 'Wystąpił nieznany błąd.',
    };
}

export function logError(error: unknown, context?: string) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';

    if (process.env.NODE_ENV === 'development') {
        console.error(`${timestamp} ${contextStr} Error:`, error);
    } else {
        // In production, you might want to send errors to a logging service
        // like Sentry, LogRocket, etc.
        console.error(`${timestamp} ${contextStr} Error occurred`);
    }
}

export function getErrorMessage(error: unknown): string {
    return handleFirebaseError(error).message;
}
