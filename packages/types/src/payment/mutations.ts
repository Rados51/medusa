import { PaymentCollectionStatus, PaymentSessionStatus } from "./common"

/**
 * Payment Collection
 */
export interface CreatePaymentCollectionDTO {
  region_id: string
  currency_code: string
  amount: number

  metadata?: Record<string, unknown>
}

export interface UpdatePaymentCollectionDTO
  extends Partial<CreatePaymentCollectionDTO> {
  id: string

  authorized_amount?: number
  refunded_amount?: number
  completed_at?: Date
  status?: PaymentCollectionStatus
}

/**
 * Payment
 */

export interface CreatePaymentDTO {
  amount: number
  authorized_amount?: number

  currency_code: string
  provider_id: string
  data: Record<string, unknown>

  payment_session_id: string
  payment_collection_id: string

  cart_id?: string
  order_id?: string
  order_edit_id?: string
  customer_id?: string
}

export interface UpdatePaymentDTO {
  id: string

  cart_id?: string
  order_id?: string
  order_edit_id?: string
  customer_id?: string

  canceled_at?: Date
  captured_at?: Date

  data?: Record<string, unknown>
}

export interface CreateCaptureDTO {
  amount: number
  payment_id: string

  captured_by?: string
}

export interface CreateRefundDTO {
  amount: number
  payment_id: string

  captured_by?: string
}

/**
 * Payment Session
 */

export interface CreatePaymentSessionDTO {
  amount: number
  currency_code: string
  provider_id: string
  data: Record<string, unknown> // Payment Provider data

  authorized_at?: Date

  cart_id?: string
  resource_id?: string
  customer_id?: string
}

export interface UpdatePaymentSessionDTO {
  id: string

  amount?: number
  currency_code?: string

  data?: Record<string, unknown>
  status?: PaymentSessionStatus

  authorized_at?: Date | null

  cart_id?: string
  resource_id?: string
  customer_id?: string
}

export interface SetPaymentSessionsDTO {
  provider_id: string
  amount: number
  session_id?: string
}

export interface SetPaymentSessionsContextDTO {
  /**
   * The payment's billing address.
   */
  billing_address?: Record<string, unknown> | null // TODO: type
  /**
   * The customer's email.
   */
  email: string
  /**
   * The ID of the resource the payment is associated with. For example, the cart's ID.
   */
  resource_id: string
  /**
   * The customer associated with this payment.
   */
  customer?: Record<string, unknown> // TODO: type
  /**
   * The cart's context.
   */
  context: Record<string, unknown>
}

/**
 * Payment Provider
 */
export interface CreatePaymentProviderDTO {
  id: string
  is_enabled?: boolean
}
