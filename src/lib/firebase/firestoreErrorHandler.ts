import { FirebaseError } from 'firebase/app';

/**
 * Firestore Query Error Handler
 * Catches and transforms Firebase errors into readable format
 */

export interface FirestoreErrorResponse {
  code: string;
  message: string;
  originalError?: string;
}

export class FirestoreError extends Error {
  public code: string;
  public message: string;

  constructor(error: unknown) {
    const errorInfo = parseFirebaseError(error);
    super(errorInfo.message);
    this.code = errorInfo.code;
    this.message = errorInfo.message;
    this.name = 'FirestoreError';
  }
}

function parseFirebaseError(error: unknown): FirestoreErrorResponse {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
    };
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        return {
          code: 'AUTHENTICATION_FAILED',
          message: 'Nieprawidłowe dane logowania',
          originalError: error.code,
        };

      case 'permission-denied':
        return {
          code: 'PERMISSION_DENIED',
          message: 'Brak uprawnień do tej operacji',
          originalError: error.code,
        };

      case 'not-found':
        return {
          code: 'NOT_FOUND',
          message: 'Zasób nie znaleziony',
          originalError: error.code,
        };

      case 'already-exists':
        return {
          code: 'ALREADY_EXISTS',
          message: 'Zasób już istnieje',
          originalError: error.code,
        };

      case 'invalid-argument':
        return {
          code: 'INVALID_ARGUMENT',
          message: 'Nieprawidłowy argument zapytania',
          originalError: error.code,
        };

      case 'unavailable':
        return {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Usługa jest tymczasowo niedostępna',
          originalError: error.code,
        };

      case 'unauthenticated':
        return {
          code: 'UNAUTHENTICATED',
          message: 'Wymagane zalogowanie',
          originalError: error.code,
        };

      default:
        return {
          code: 'FIRESTORE_ERROR',
          message: error.message || 'Błąd Firestore',
          originalError: error.code,
        };
    }
  }

  if (error instanceof Error) {
    return {
      code: 'ERROR',
      message: error.message,
      originalError: error.constructor.name,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
  };
}

/**
 * Wrapper for Firestore queries with error handling
 */

export async function withFirestoreErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const firestoreError = new FirestoreError(error);
    console.error(
      `[Firestore${context ? ` - ${context}` : ''}] ${firestoreError.code}: ${firestoreError.message}`,
      error
    );
    throw firestoreError;
  }
}

/**
 * Safe query execution - returns null instead of throwing
 */

export async function safeFirestoreQuery<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const firestoreError = new FirestoreError(error);
    console.warn(
      `[Firestore${context ? ` - ${context}` : ''}] ${firestoreError.code}: ${firestoreError.message}`
    );
    return null;
  }
}
