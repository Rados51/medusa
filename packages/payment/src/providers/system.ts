import {
  IPaymentProcessor,
  PaymentProcessorContext,
  PaymentProcessorError,
  PaymentProcessorSessionResponse,
  PaymentSessionStatus,
} from "@medusajs/types"

// TODO: move class
import { AbstractPaymentProcessor } from "@medusajs/medusa"

export class SystemProviderService extends AbstractPaymentProcessor {
  static identifier = "system"

  async createPayment(_): Promise<Record<string, unknown>> {
    return {}
  }

  async getStatus(_): Promise<string> {
    return "authorized"
  }

  async getPaymentData(_): Promise<Record<string, unknown>> {
    return {}
  }

  async initiatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorSessionResponse> {
    return { session_data: {} }
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    throw new Error("Method not implemented.")
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<Record<string, unknown> | PaymentProcessorError> {
    throw new Error("Method not implemented.")
  }

  async authorizePayment(_): Promise<Record<string, unknown>> {
    return { data: {}, status: "authorized" }
  }

  async updatePaymentData(_): Promise<Record<string, unknown>> {
    return {}
  }

  async updatePayment(_): Promise<Record<string, unknown>> {
    return {}
  }

  async deletePayment(_): Promise<Record<string, unknown>> {
    return {}
  }

  async capturePayment(_): Promise<Record<string, unknown>> {
    return {}
  }

  async refundPayment(_): Promise<Record<string, unknown>> {
    return {}
  }

  async cancelPayment(_): Promise<Record<string, unknown>> {
    return {}
  }
}

export default SystemProviderService
