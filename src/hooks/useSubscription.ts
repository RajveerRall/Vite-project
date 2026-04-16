/**
 * React hook for fetching subscription information
 */

import { useEffect, useState } from 'react'
import { api } from '../services/api'

export interface SubscriptionInfo {
  user_id: string
  profile: {
    tts_minutes_limit: number
    tts_minutes_used: number
    prepaid_minutes: number
    last_reset_date: string | null
  }
  subscription: {
    id: string
    status: string
    plan_id: string
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    payment_gateway_subscription_id: string
  } | null
  product: {
    id: string
    name: string
    description: string | null
    tts_minutes_included: number
    price_per_month: number | null
    currency: string
  } | null
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ subscription: SubscriptionInfo }>('/subscriptions')
      .then((response) => {
        if (response.error) {
          setError(response.error)
        } else {
          setSubscription(response.data?.subscription || null)
        }
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const refetch = async () => {
    setLoading(true)
    const response = await api.get<{ subscription: SubscriptionInfo }>('/subscriptions')
    if (response.error) {
      setError(response.error)
    } else {
      setSubscription(response.data?.subscription || null)
      setError(null)
    }
    setLoading(false)
  }

  return { subscription, loading, error, refetch }
}

