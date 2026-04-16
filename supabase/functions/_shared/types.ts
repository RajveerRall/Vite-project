/**
 * Shared TypeScript types for Edge Functions
 */

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success?: boolean
}

export interface SubscriptionStatus {
  active: 'active'
  inactive: 'inactive'
  trial: 'trial'
  cancelled: 'cancelled'
  past_due: 'past_due'
}

export interface DodoPaymentsCustomer {
  customer_id: string
  email: string
  name?: string
  metadata?: Record<string, any>
}

export interface DodoPaymentsSubscription {
  subscription_id: string
  customer_id: string
  product_id: string
  status: string
  billing?: {
    current_period_start?: string
    current_period_end?: string
  }
  next_billing_date?: string
  cancel_at_next_billing_date?: boolean
  created_at?: string
  updated_at?: string
}

export interface DodoPaymentsPayment {
  payment_id: string
  customer_id: string
  subscription_id?: string
  product_id?: string
  total_amount: number
  currency: string
  status: string
  metadata?: Record<string, any>
}

export interface WebhookEvent {
  type: string
  data: DodoPaymentsSubscription | DodoPaymentsPayment | any
  timestamp?: string
}

