/**
 * Utility functions for handling secure redirects after authentication
 */

/**
 * Validates if a redirect URL is safe to use (within our domain)
 * @param redirectUrl - The URL to validate
 * @returns boolean - true if safe, false otherwise
 */
export const isValidRedirectUrl = (redirectUrl: string | null): boolean => {
  if (!redirectUrl) return false;
  
  try {
    // If it's a relative path, it's safe
    if (redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
      return true;
    }
    
    // If it's an absolute URL, check if it's from our domain
    const url = new URL(redirectUrl);
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    
    // Allow localhost for development and our production domain
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      currentDomain,
      // Add your production domain here
      // 'yourdomain.com',
      // 'www.yourdomain.com'
    ];
    
    return allowedDomains.includes(url.hostname);
  } catch (error) {
    // If URL parsing fails, it's not a valid URL
    return false;
  }
};

/**
 * Gets a safe redirect URL, defaulting to home if the provided URL is unsafe
 * @param redirectUrl - The URL to validate and return
 * @param defaultUrl - The default URL to return if redirectUrl is invalid (default: '/')
 * @returns string - A safe URL to redirect to
 */
export const getSafeRedirectUrl = (redirectUrl: string | null, defaultUrl: string = '/'): string => {
  if (isValidRedirectUrl(redirectUrl)) {
    return redirectUrl!;
  }
  return defaultUrl;
};

/**
 * Creates a redirect URL for the auth page with the current page as redirect parameter
 * @param currentPath - The current page path (optional, will use window.location.pathname if not provided)
 * @returns string - The auth URL with redirect parameter
 */
export const createAuthRedirectUrl = (currentPath?: string): string => {
  const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  return `/auth?redirect=${encodeURIComponent(path)}`;
};

/**
 * Redirects to auth page with current page as redirect parameter
 * @param currentPath - The current page path (optional)
 */
export const redirectToAuth = (currentPath?: string): void => {
  if (typeof window !== 'undefined') {
    window.location.href = createAuthRedirectUrl(currentPath);
  }
};

/**
 * Creates a redirect URL for role-specific auth pages with the current page as redirect parameter
 * @param role - The user role (artist, organizer, venue)
 * @param currentPath - The current page path (optional, will use window.location.pathname if not provided)
 * @returns string - The role-specific auth URL with redirect parameter
 */
export const createRoleAuthRedirectUrl = (role: 'artist' | 'organizer' | 'venue', currentPath?: string): string => {
  const path = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  return `/${role}/auth/login?redirect=${encodeURIComponent(path)}`;
};

/**
 * Redirects to role-specific auth page with current page as redirect parameter
 * @param role - The user role (artist, organizer, venue)
 * @param currentPath - The current page path (optional)
 */
export const redirectToRoleAuth = (role: 'artist' | 'organizer' | 'venue', currentPath?: string): void => {
  if (typeof window !== 'undefined') {
    window.location.href = createRoleAuthRedirectUrl(role, currentPath);
  }
};
