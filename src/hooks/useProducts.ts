/**
 * React hook for fetching products
 */

import { useEffect, useState } from 'react'
import { api } from '../services/api'

export interface Product {
  id: string
  gateway_product_id: string
  name: string
  description: string | null
  tts_minutes_included: number
  price_per_month: number | null
  currency: string
  is_active: boolean
  metadata: any
  prices?: Array<{
    id: string
    gateway_price_id: string
    unit_amount: number
    currency: string
    interval: string
    interval_count: number
    is_active: boolean
  }>
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ products: Product[] }>('/products')
      .then((response) => {
        if (response.error) {
          setError(response.error)
        } else {
          setProducts(response.data?.products || [])
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
    const response = await api.get<{ products: Product[] }>('/products')
    if (response.error) {
      setError(response.error)
    } else {
      setProducts(response.data?.products || [])
      setError(null)
    }
    setLoading(false)
  }

  return { products, loading, error, refetch }
}

