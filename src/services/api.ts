/**
 * Centralized API Client for Edge Functions
 * Handles authentication, error handling, and request/response interceptors
 */

import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success?: boolean
}

export interface ApiError {
  error: string
  limit_exceeded?: boolean
  message?: string
}

class ApiClient {
  private async request<T>(
    functionName: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        return { error: 'Not authenticated' }
      }

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/${functionName}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      })

      // Handle 401 - try to refresh token
      if (response.status === 401) {
        const { data: { session: newSession } } = await supabase.auth.getSession()
        if (newSession?.access_token && newSession.access_token !== token) {
          // Retry with new token
          const retryResponse = await fetch(`${SUPABASE_FUNCTIONS_URL}/${functionName}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newSession.access_token}`,
              ...options.headers,
            },
          })

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({ error: 'Unauthorized' }))
            return { error: errorData.error || `HTTP ${retryResponse.status}` }
          }

          const retryData = await retryResponse.json()
          return { data: retryData }
        }

        // Redirect to login if refresh fails
        window.location.href = '/login'
        return { error: 'Unauthorized' }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        return { error: errorData.error || `HTTP ${response.status}`, ...errorData }
      }

      const data = await response.json()
      return { data }
    } catch (error: any) {
      console.error(`[API] Error calling ${functionName}:`, error)
      return { error: error.message || 'Network error' }
    }
  }

  async get<T>(functionName: string): Promise<ApiResponse<T>> {
    return this.request<T>(functionName, { method: 'GET' })
  }

  async post<T>(functionName: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(functionName, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(functionName: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(functionName, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(functionName: string): Promise<ApiResponse<T>> {
    return this.request<T>(functionName, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
export default api

