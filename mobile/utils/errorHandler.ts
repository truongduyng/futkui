// Global error handler for unhandled promise rejections and errors

// Track if error handler is already setup to avoid duplicates
let isErrorHandlerSetup = false;

export function setupGlobalErrorHandler() {
  if (isErrorHandlerSetup) return;
  
  // Handle unhandled promise rejections
  const originalUnhandledRejection = global.HermesInternal?.HermesInternal?.setPromiseRejectionTracker || 
    global.__DEV__ ? console.warn : () => {};

  // Override the default unhandled rejection handler
  if (global.HermesInternal?.HermesInternal?.setPromiseRejectionTracker) {
    global.HermesInternal.HermesInternal.setPromiseRejectionTracker((id: number, rejection: any) => {
      console.error('Unhandled Promise Rejection:', rejection);
      
      // In development, still show the warning
      if (__DEV__) {
        console.warn('Unhandled promise rejection (id: ' + id + '):', rejection);
      }
      
      // Don't let unhandled rejections crash the app in production
      // You might want to send this to crash reporting service like Crashlytics
    });
  }

  // Handle JavaScript errors
  const originalErrorHandler = global.ErrorUtils?.getGlobalHandler?.();
  
  global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
    console.error('Global JavaScript Error:', error);
    
    // In development, let the original handler show the red screen
    if (__DEV__ && originalErrorHandler) {
      originalErrorHandler(error, isFatal);
      return;
    }
    
    // In production, log the error but don't crash the app for non-fatal errors
    if (!isFatal) {
      console.error('Non-fatal error caught:', error);
      // You might want to send this to crash reporting service
      return;
    }
    
    // For fatal errors, still crash but with logging
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });

  isErrorHandlerSetup = true;
}

// Helper function to safely execute async operations
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  onError?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Safe async operation failed:', err);
    
    if (onError) {
      onError(err);
    }
    
    return fallback;
  }
}

// Helper function to safely execute sync operations
export function safeSync<T>(
  operation: () => T,
  fallback?: T,
  onError?: (error: Error) => void
): T | undefined {
  try {
    return operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Safe sync operation failed:', err);
    
    if (onError) {
      onError(err);
    }
    
    return fallback;
  }
}