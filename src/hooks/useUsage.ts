/**
 * React hook for incrementing TTS usage
 */

import { useState } from 'react'
import { api } from '../services/api'

export interface IncrementUsageParams {
  seconds: number
  source?: 'reader' | 'full-cast' | string
  event_id?: string
}

export function useUsage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitExceeded, setLimitExceeded] = useState(false)

  const incrementUsage = async (params: IncrementUsageParams): Promise<boolean> => {
    setLoading(true)
    setError(null)
    setLimitExceeded(false)

    try {
      const response = await api.post<{ success: boolean }>('/increment-usage', params)

      if (response.error) {
        // Check if it's a limit exceeded error
        if (response.limit_exceeded || response.error?.includes('limit exceeded')) {
          setLimitExceeded(true)
        }
        setError(response.error)
        return false
      }

      return response.data?.success || false
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { incrementUsage, loading, error, limitExceeded }
}

