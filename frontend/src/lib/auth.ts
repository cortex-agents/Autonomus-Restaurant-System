const STORAGE_KEY = "auth_data";

export interface AuthData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Timestamp in seconds
}

export const isAuthenticated = (): boolean => {
  const authData = localStorage.getItem(STORAGE_KEY);
  if (!authData) return false;
  try {
    const parsed: AuthData = JSON.parse(authData);
    return parsed.expires_at * 1000 > Date.now() + 60000; // 1 minute buffer
  } catch {
    return false;
  }
};

export const getAuthHeaders = (): HeadersInit => {
  // If we are on the server, localStorage is not available
  if (typeof window === 'undefined') {
    return {};
  }
  const authData = localStorage.getItem(STORAGE_KEY);
  if (!authData) return {};
  try {
    const { access_token } = JSON.parse(authData);
    return {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    };
  } catch {
    return {};
  }
};

export const getUserFromToken = (): { restaurantId: string; email: string } | null => {
  // If we are on the server, localStorage is not available
  if (typeof window === 'undefined') {
    return null;
  }
  const authData = localStorage.getItem(STORAGE_KEY);
  if (!authData) return null;
  try {
    const { access_token } = JSON.parse(authData);

    // Decode JWT token (header.payload.signature)
    const payload = access_token.split('.')[1];
    if (!payload) return null;

    // Add padding if needed and decode base64url
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsedPayload = JSON.parse(decodedPayload);

    // Extract restaurant_id and email from payload
    // The field names might vary based on your backend implementation
    // Common variations: restaurant_id, restaurantId, sub, etc.
    const restaurantId = parsedPayload.restaurant_id || parsedPayload.restaurantId || parsedPayload.sub || "1";
    const email = parsedPayload.email || parsedPayload.user_email || "owner@example.com";

    return {
      restaurantId: String(restaurantId),
      email: String(email),
    };
  } catch (err) {
    console.error("Failed to decode token:", err);
    return null;
  }
};

export const setAuthData = (data: AuthData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const refreshToken = async (): Promise<boolean> => {
  const authData = localStorage.getItem(STORAGE_KEY);
  if (!authData) return false;

  try {
    const { refresh_token } = JSON.parse(authData);

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();

    // Update stored tokens
    // Extract expiration from JWT token (exp is in seconds since epoch)
    let expiresAt = Math.floor(Date.now() / 1000) + 3600; // Default 1 hour from now
    try {
      const payload = data.access_token.split('.')[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const parsedPayload = JSON.parse(decodedPayload);
      if (parsedPayload.exp) {
        expiresAt = parsedPayload.exp;
      }
    } catch (e) {
      console.warn('Failed to parse expiration from token, using default:', e);
    }
    const updatedAuthData = {
      ...JSON.parse(authData),
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAuthData));
    return true;
  } catch (err) {
    console.error("Token refresh failed:", err);
    // Clear auth data on refresh failure
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
};
