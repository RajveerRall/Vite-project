/**
 * React hook for creating checkout sessions
 */

import { useState } from 'react'
import { api } from '../services/api'

export interface CheckoutSession {
  checkout_url: string
}

export interface CreateCheckoutParams {
  product_cart: Array<{
    product_id: string
    quantity?: number
  }>
  return_url?: string
}

export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCheckout = async (params: CreateCheckoutParams): Promise<string | null> => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.post<CheckoutSession>('/subscriptions', {
        action: 'checkout',
        ...params
      })

      if (response.error) {
        setError(response.error)
        return null
      }

      return response.data?.checkout_url || null
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createCheckout, loading, error }
}

