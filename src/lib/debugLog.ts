// Debug flag - only log in development mode
const DEBUG = false;

// Helper function to log only in debug mode
export const debugLog = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};

export const debugWarn = (...args: any[]) => {
  if (DEBUG) console.warn(...args);
};

export const debugError = (...args: any[]) => {
  if (DEBUG) console.error(...args);
};

// Helper function to decode JWT and check expiration
export const getTokenInfo = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp ? new Date(payload.exp * 1000) : null;
    const now = new Date();
    const isExpired = exp ? now > exp : false;
    
    return {
      exp,
      isExpired,
      expiresIn: exp ? Math.round((exp.getTime() - now.getTime()) / 1000) + "s" : "unknown",
    };
  } catch (e) {
    return null;
  }
};
