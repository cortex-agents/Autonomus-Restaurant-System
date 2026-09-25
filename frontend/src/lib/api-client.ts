import { getAuthHeaders, isAuthenticated, refreshToken, logout } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

class ApiClient {
  private async fetchWithRefresh<T>(
    input: RequestInfo,
    init: RequestInit = {}
  ): Promise<T> {
    let response = await fetch(`${API_BASE_URL}${input}`, {
      ...init,
      headers: {
        ...getAuthHeaders(),
        ...(init.headers || {}),
      },
    });

    // If we get a 401, try to refresh the token
    if (response.status === 401) {
      const isRefreshed = await refreshToken();
      if (isRefreshed) {
        response = await fetch(`${API_BASE_URL}${input}`, {
          ...init,
          headers: {
            ...getAuthHeaders(),
            ...(init.headers || {}),
          },
        });
      } else {
        // If refresh fails, logout the user
        logout();
        // In a real app, we would redirect to login here
        throw new Error("Session expired. Please log in again.");
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || errorData.message || `HTTP error! Status: ${response.status}`
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.fetchWithRefresh<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.fetchWithRefresh<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.fetchWithRefresh<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.fetchWithRefresh<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();

// Convenience functions for direct use with React Query
export const fetcher = async <T>(endpoint: string): Promise<T> => {
  return apiClient.get<T>(endpoint);
};

export const postFetcher = async <T>(endpoint: string, data: unknown): Promise<T> => {
  return apiClient.post<T>(endpoint, data);
};

export const patchFetcher = async <T>(endpoint: string, data: unknown): Promise<T> => {
  return apiClient.patch<T>(endpoint, data);
};

export const deleteFetcher = async <T>(endpoint: string): Promise<T> => {
  return apiClient.delete<T>(endpoint);
};