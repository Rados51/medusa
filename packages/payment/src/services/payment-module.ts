import {
  CaptureDTO,
  Context,
  CreateCaptureDTO,
  CreatePaymentCollectionDTO,
  CreatePaymentDTO,
  CreatePaymentProviderDTO,
  CreatePaymentSessionDTO,
  CreateRefundDTO,
  DAL,
  InternalModuleDeclaration,
  IPaymentModuleService,
  ModuleJoinerConfig,
  ModulesSdkTypes,
  PaymentCollectionDTO,
  PaymentCollectionStatus,
  PaymentDTO,
  PaymentSessionDTO,
  PaymentSessionStatus,
  RefundDTO,
  SetPaymentSessionsContextDTO,
  SetPaymentSessionsDTO,
  UpdatePaymentCollectionDTO,
  UpdatePaymentDTO,
  UpdatePaymentSessionDTO,
} from "@medusajs/types"
import {
  InjectTransactionManager,
  MedusaContext,
  ModulesSdkUtils,
  MedusaError,
  InjectManager,
} from "@medusajs/utils"
import {
  Capture,
  Payment,
  PaymentCollection,
  PaymentSession,
  Refund,
} from "@models"

import { entityNameToLinkableKeysMap, joinerConfig } from "../joiner-config"
import PaymentProviderService from "./payment-provider"

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
  paymentService: ModulesSdkTypes.InternalModuleService<any>
  captureService: ModulesSdkTypes.InternalModuleService<any>
  refundService: ModulesSdkTypes.InternalModuleService<any>
  paymentSessionService: ModulesSdkTypes.InternalModuleService<any>
  paymentCollectionService: ModulesSdkTypes.InternalModuleService<any>
  paymentProviderService: PaymentProviderService
}

const generateMethodForModels = [PaymentCollection, PaymentSession, Payment]

export default class PaymentModuleService<
    TPaymentCollection extends PaymentCollection = PaymentCollection,
    TPayment extends Payment = Payment,
    TCapture extends Capture = Capture,
    TRefund extends Refund = Refund,
    TPaymentSession extends PaymentSession = PaymentSession
  >
  extends ModulesSdkUtils.abstractModuleServiceFactory<
    InjectedDependencies,
    PaymentCollectionDTO,
    {
      PaymentCollection: { dto: PaymentCollectionDTO }
      PaymentSession: { dto: PaymentSessionDTO }
      Payment: { dto: PaymentDTO }
      Capture: { dto: CaptureDTO }
      Refund: { dto: RefundDTO }
    }
  >(PaymentCollection, generateMethodForModels, entityNameToLinkableKeysMap)
  implements IPaymentModuleService
{
  protected baseRepository_: DAL.RepositoryService

  protected paymentService_: ModulesSdkTypes.InternalModuleService<TPayment>
  protected captureService_: ModulesSdkTypes.InternalModuleService<TCapture>
  protected refundService_: ModulesSdkTypes.InternalModuleService<TRefund>
  protected paymentSessionService_: ModulesSdkTypes.InternalModuleService<TPaymentSession>
  protected paymentCollectionService_: ModulesSdkTypes.InternalModuleService<TPaymentCollection>
  protected paymentProviderService_: PaymentProviderService

  constructor(
    {
      baseRepository,
      paymentService,
      captureService,
      refundService,
      paymentSessionService,
      paymentProviderService,
      paymentCollectionService,
    }: InjectedDependencies,
    protected readonly moduleDeclaration: InternalModuleDeclaration
  ) {
    // @ts-ignore
    super(...arguments)

    this.baseRepository_ = baseRepository

    this.refundService_ = refundService
    this.captureService_ = captureService
    this.paymentService_ = paymentService
    this.paymentProviderService_ = paymentProviderService
    this.paymentSessionService_ = paymentSessionService
    this.paymentCollectionService_ = paymentCollectionService
  }

  __joinerConfig(): ModuleJoinerConfig {
    return joinerConfig
  }

  __hooks = {
    onApplicationStart: async () => await this.createProvidersOnLoad(),
  }

  createPaymentCollection(
    data: CreatePaymentCollectionDTO,
    sharedContext?: Context
  ): Promise<PaymentCollectionDTO>

  createPaymentCollection(
    data: CreatePaymentCollectionDTO[],
    sharedContext?: Context
  ): Promise<PaymentCollectionDTO[]>

  @InjectTransactionManager("baseRepository_")
  async createPaymentCollection(
    data: CreatePaymentCollectionDTO | CreatePaymentCollectionDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentCollectionDTO | PaymentCollectionDTO[]> {
    const input = Array.isArray(data) ? data : [data]

    const collections = await this.paymentCollectionService_.create(
      input,
      sharedContext
    )

    return await this.baseRepository_.serialize<PaymentCollectionDTO[]>(
      Array.isArray(data) ? collections : collections[0],
      {
        populate: true,
      }
    )
  }

  updatePaymentCollection(
    data: UpdatePaymentCollectionDTO[],
    sharedContext?: Context
  ): Promise<PaymentCollectionDTO[]>
  updatePaymentCollection(
    data: UpdatePaymentCollectionDTO,
    sharedContext?: Context
  ): Promise<PaymentCollectionDTO>

  @InjectTransactionManager("baseRepository_")
  async updatePaymentCollection(
    data: UpdatePaymentCollectionDTO | UpdatePaymentCollectionDTO[],
    sharedContext?: Context
  ): Promise<PaymentCollectionDTO | PaymentCollectionDTO[]> {
    const input = Array.isArray(data) ? data : [data]
    const result = await this.paymentCollectionService_.update(
      input,
      sharedContext
    )

    return await this.baseRepository_.serialize<PaymentCollectionDTO[]>(
      Array.isArray(data) ? result : result[0],
      {
        populate: true,
      }
    )
  }

  createPayment(
    data: CreatePaymentDTO,
    sharedContext?: Context
  ): Promise<PaymentDTO>
  createPayment(
    data: CreatePaymentDTO[],
    sharedContext?: Context
  ): Promise<PaymentDTO[]>

  @InjectTransactionManager("baseRepository_")
  async createPayment(
    data: CreatePaymentDTO | CreatePaymentDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentDTO | PaymentDTO[]> {
    let input = Array.isArray(data) ? data : [data]

    input = input.map((inputData) => ({
      payment_collection: inputData.payment_collection_id,
      payment_session: inputData.payment_session_id,
      ...inputData,
    }))

    const payments = await this.paymentService_.create(input, sharedContext)

    return await this.baseRepository_.serialize<PaymentDTO[]>(
      Array.isArray(data) ? payments : payments[0],
      {
        populate: true,
      }
    )
  }

  updatePayment(
    data: UpdatePaymentDTO,
    sharedContext?: Context | undefined
  ): Promise<PaymentDTO>
  updatePayment(
    data: UpdatePaymentDTO[],
    sharedContext?: Context | undefined
  ): Promise<PaymentDTO[]>

  @InjectTransactionManager("baseRepository_")
  async updatePayment(
    data: UpdatePaymentDTO | UpdatePaymentDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentDTO | PaymentDTO[]> {
    const input = Array.isArray(data) ? data : [data]
    const result = await this.paymentService_.update(input, sharedContext)

    return await this.baseRepository_.serialize<PaymentDTO[]>(
      Array.isArray(data) ? result : result[0],
      {
        populate: true,
      }
    )
  }

  capturePayment(
    data: CreateCaptureDTO,
    sharedContext?: Context
  ): Promise<PaymentDTO>
  capturePayment(
    data: CreateCaptureDTO[],
    sharedContext?: Context
  ): Promise<PaymentDTO[]>

  @InjectManager("baseRepository_")
  async capturePayment(
    data: CreateCaptureDTO | CreateCaptureDTO[],
    @MedusaContext() sharedContext: Context = {}
  ): Promise<PaymentDTO | PaymentDTO[]> {
    const input = Array.isArray(data) ? data : [data]

    const payments = await this.capturePaymentBulk_(input, sharedContext)

    return await this.baseRepository_.serialize(
      Array.isArray(data) ? payments : payments[0],
      { populate: true }
    )
  }

  @InjectTransactionManager("baseRepository_")
  protected async capturePaymentBulk_(
    data: CreateCaptureDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<Payment[]> {
    let payments = await this.paymentService_.list(
      { id: data.map((d) => d.payment_id) },
      {},
      sharedContext
    )
    const inputMap = new Map(data.map((d) => [d.payment_id, d]))

    for (const payment of payments) {
      const input = inputMap.get(payment.id)!

      if (payment.canceled_at) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The payment: ${payment.id} has been canceled.`
        )
      }

      if (payment.captured_at) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The payment: ${payment.id} is already fully captured.`
        )
      }

      // TODO: revisit when https://github.com/medusajs/medusa/pull/6253 is merged
      // if (payment.captured_amount + input.amount > payment.authorized_amount) {
      //   throw new MedusaError(
      //     MedusaError.Types.INVALID_DATA,
      //     `Total captured amount for payment: ${payment.id} exceeds authorized amount.`
      //   )
      // }
    }

    const paymentData = await Promise.all(
      payments.map((payment) =>
        this.paymentProviderService_.capturePayment({
          data: payment.data!,
          provider_id: payment.provider_id,
        })
      )
    )

    await this.captureService_.create(
      data.map((d) => ({
        payment: d.payment_id,
        amount: d.amount,
        captured_by: d.captured_by,
      })),
      sharedContext
    )

    await this.updatePayment(
      payments.map((p, i) => ({ id: p.id, data: paymentData[i] }))
    )

    let fullyCapturedPaymentsId: string[] = []
    for (const payment of payments) {
      const input = inputMap.get(payment.id)!

      // TODO: revisit when https://github.com/medusajs/medusa/pull/6253 is merged
      // if (payment.captured_amount + input.amount === payment.amount) {
      //   fullyCapturedPaymentsId.push(payment.id)
      // }
    }

    if (fullyCapturedPaymentsId.length) {
      await this.paymentService_.update(
        fullyCapturedPaymentsId.map((id) => ({ id, captured_at: new Date() })),
        sharedContext
      )
    }

    // TODO: set PaymentCollection status if fully captured

    return await this.paymentService_.list(
      { id: data.map((d) => d.payment_id) },
      {
        relations: ["captures"],
      },
      sharedContext
    )
  }

  refundPayment(
    data: CreateRefundDTO,
    sharedContext?: Context
  ): Promise<PaymentDTO>
  refundPayment(
    data: CreateRefundDTO[],
    sharedContext?: Context
  ): Promise<PaymentDTO[]>

  @InjectManager("baseRepository_")
  async refundPayment(
    data: CreateRefundDTO | CreateRefundDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentDTO | PaymentDTO[]> {
    const input = Array.isArray(data) ? data : [data]

    const payments = await this.refundPaymentBulk_(input, sharedContext)

    return await this.baseRepository_.serialize(
      Array.isArray(data) ? payments : payments[0],
      { populate: true }
    )
  }

  @InjectTransactionManager("baseRepository_")
  async refundPaymentBulk_(
    data: CreateRefundDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<Payment[]> {
    const payments = await this.paymentService_.list(
      { id: data.map(({ payment_id }) => payment_id) },
      {},
      sharedContext
    )

    const inputMap = new Map(data.map((d) => [d.payment_id, d]))

    // TODO: revisit when https://github.com/medusajs/medusa/pull/6253 is merged
    // for (const payment of payments) {
    //   const input = inputMap.get(payment.id)!
    //   if (payment.captured_amount < input.amount) {
    //     throw new MedusaError(
    //       MedusaError.Types.INVALID_DATA,
    //       `Refund amount for payment: ${payment.id} cannot be greater than the amount captured on the payment.`
    //     )
    //   }
    // }

    const paymentData = await Promise.all(
      payments.map((payment) =>
        this.paymentProviderService_.refundFromPayment(
          {
            data: payment.data!,
            provider_id: payment.provider_id,
          },
          inputMap.get(payment.id)!.amount
        )
      )
    )

    await this.refundService_.create(
      data.map((d) => ({
        payment: d.payment_id,
        amount: d.amount,
        captured_by: d.created_by,
      })),
      sharedContext
    )

    await this.updatePayment(
      payments.map((p, i) => ({ id: p.id, data: paymentData[i] }))
    )

    return await this.paymentService_.list(
      { id: data.map(({ payment_id }) => payment_id) },
      {
        relations: ["refunds"],
      },
      sharedContext
    )
  }

  createPaymentSession(
    paymentCollectionId: string,
    data: CreatePaymentSessionDTO,
    sharedContext?: Context | undefined
  ): Promise<PaymentSessionDTO>
  createPaymentSession(
    paymentCollectionId: string,
    data: CreatePaymentSessionDTO[],
    sharedContext?: Context | undefined
  ): Promise<PaymentSessionDTO[]>

  @InjectTransactionManager("baseRepository_")
  async createPaymentSession(
    paymentCollectionId: string,
    data: CreatePaymentSessionDTO | CreatePaymentSessionDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentSessionDTO | PaymentSessionDTO[]> {
    let input = Array.isArray(data) ? data : [data]

    input = input.map((inputData) => ({
      payment_collection: paymentCollectionId,
      ...inputData,
    }))

    const created = await this.paymentSessionService_.create(
      input,
      sharedContext
    )

    return this.baseRepository_.serialize(
      Array.isArray(data) ? created : created[0],
      { populate: true }
    )
  }

  @InjectTransactionManager("baseRepository_")
  async authorizePaymentCollection(
    paymentCollectionId: string,
    sessionIds: string[],
    context: Record<string, unknown> = {},
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentCollectionDTO> {
    const paymentCollection = await this.retrievePaymentCollection(
      paymentCollectionId,
      { relations: ["payment_sessions", "payments"] }
    )

    if (paymentCollection.authorized_amount === paymentCollection.amount) {
      return paymentCollection
    }

    if (paymentCollection.amount < 0) {
      return await this.updatePaymentCollection(
        {
          id: paymentCollectionId,
          authorized_amount: 0,
          status: PaymentCollectionStatus.AUTHORIZED,
        },
        sharedContext
      )
    }

    if (!paymentCollection.payment_sessions?.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You cannot complete a Payment Collection without a payment session."
      )
    }

    let authorizedAmount = 0

    for (const paymentSession of paymentCollection.payment_sessions) {
      if (paymentSession.authorized_at) {
        continue
      }

      if (!sessionIds.includes(paymentSession.id)) {
        continue
      }

      const { data, status } =
        await this.paymentProviderService_.authorizePayment(
          {
            provider_id: paymentSession.provider_id,
            data: paymentSession.data,
          },
          context
        )

      await this.paymentSessionService_.update({
        id: paymentSession.id,
        data,
        status,
        authorized_at:
          status === PaymentSessionStatus.AUTHORIZED ? new Date() : null,
      })

      if (status === PaymentSessionStatus.AUTHORIZED) {
        authorizedAmount += paymentSession.amount

        await this.createPayment(
          {
            amount: paymentSession.amount,
            authorized_amount: paymentSession.amount,
            currency_code: paymentCollection.currency_code,
            provider_id: paymentSession.provider_id,
            payment_session_id: paymentSession.id,
            payment_collection_id: paymentCollection.id,
            data: paymentSession.data, // TODO: fetch latest data here <-
            // TODO: cart_id
          },
          sharedContext
        )
      }
    }

    let status = paymentCollection.status

    if (authorizedAmount === 0) {
      status = PaymentCollectionStatus.AWAITING
    } else if (authorizedAmount < paymentCollection.amount) {
      status = PaymentCollectionStatus.PARTIALLY_AUTHORIZED
    } else if (authorizedAmount === paymentCollection.amount) {
      status = PaymentCollectionStatus.AUTHORIZED
    }

    await this.updatePaymentCollection(
      {
        id: paymentCollectionId,
        authorized_amount: authorizedAmount,
        status,
      },
      sharedContext
    )

    return this.retrievePaymentCollection(
      paymentCollectionId,
      {},
      sharedContext
    )
  }

  @InjectTransactionManager("baseRepository_")
  async setPaymentSessions(
    paymentCollectionId: string,
    data: SetPaymentSessionsDTO[],
    context: SetPaymentSessionsContextDTO,
    sharedContext?: Context | undefined
  ): Promise<PaymentCollectionDTO> {
    const paymentCollection = await this.retrievePaymentCollection(
      paymentCollectionId,
      { relations: ["payment_sessions", "payment_providers"] },
      sharedContext
    )

    if (paymentCollection.status !== PaymentCollectionStatus.NOT_PAID) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot set payment sessions for a payment collection with status ${paymentCollection.status}`
      )
    }

    const paymentSessionsMap = new Map(
      paymentCollection.payment_sessions!.map((session) => [
        session.id,
        session,
      ])
    )

    const totalSessionsAmount = data.reduce((acc, i) => acc + i.amount, 0)

    if (totalSessionsAmount !== paymentCollection.amount) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `The sum of sessions is not equal to ${paymentCollection.amount} on Payment Collection`
      )
    }

    const currentSessionsIds: string[] = []

    for (const input of data) {
      const existingSession = input.session_id
        ? paymentSessionsMap.get(input.session_id)
        : null
      let paymentSession: PaymentSessionDTO

      const providerDataInput = {
        amount: input.amount,
        currency_code: paymentCollection.currency_code,

        resource_id: context.resource_id,
        email: context.email,
        customer: context.customer,
        context: context.context,
        billing_address: context.billing_address,
        paymentSessionData: existingSession?.data || {},
      }

      if (existingSession) {
        await this.paymentProviderService_.updateSession(
          {
            id: existingSession.id,
            provider_id: existingSession.provider_id,
            data: existingSession.data,
          },
          providerDataInput
        )

        paymentSession = await this.updatePaymentSession({
          id: existingSession.id,
          amount: input.amount,
          // currency_code: input.currency_code,
          customer_id: context.customer!.id as string,
          resource_id: context.resource_id,
          data: existingSession.data,
        })
      } else {
        const sessionData = await this.paymentProviderService_.createSession(
          input.provider_id,
          providerDataInput
        )

        paymentSession = await this.createPaymentSession(paymentCollectionId, {
          amount: input.amount,
          provider_id: input.provider_id,
          currency_code: paymentCollection.currency_code,
          data: sessionData,
        })
      }

      currentSessionsIds.push(paymentSession.id)
    }

    if (paymentCollection.payment_sessions?.length) {
      const toRemoveSessions = paymentCollection.payment_sessions.filter(
        ({ id }) => !currentSessionsIds.includes(id)
      )

      if (toRemoveSessions.length) {
        await Promise.all(
          toRemoveSessions.map((session) =>
            this.paymentProviderService_.deleteSession({
              provider_id: session.provider_id,
              data: session.data,
            })
          )
        )

        await this.deletePaymentSession(
          toRemoveSessions.map(({ id }) => id),
          sharedContext
        )
      }
    }

    return await this.retrievePaymentCollection(
      paymentCollectionId,
      {},
      sharedContext
    )
  }

  deletePaymentSession(ids: string[], sharedContext?: Context): Promise<void>
  deletePaymentSession(id: string, sharedContext?: Context): Promise<void>
  @InjectTransactionManager("baseRepository_")
  async deletePaymentSession(
    ids: string | string[],
    @MedusaContext() sharedContext?: Context
  ): Promise<void> {
    const paymentCollectionIds = Array.isArray(ids) ? ids : [ids]
    await this.paymentSessionService_.delete(
      paymentCollectionIds,
      sharedContext
    )
  }

  updatePaymentSession(
    data: UpdatePaymentSessionDTO,
    sharedContext?: Context
  ): Promise<PaymentSessionDTO>
  updatePaymentSession(
    data: UpdatePaymentSessionDTO[],
    sharedContext?: Context
  ): Promise<PaymentSessionDTO[]>
  @InjectTransactionManager("baseRepository_")
  async updatePaymentSession(
    data: UpdatePaymentSessionDTO | UpdatePaymentSessionDTO[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentSessionDTO | PaymentSessionDTO[]> {
    const input = Array.isArray(data) ? data : [data]
    const sessions = await this.paymentSessionService_.update(
      input,
      sharedContext
    )

    return await this.baseRepository_.serialize(
      Array.isArray(data) ? sessions : sessions[0],
      { populate: true }
    )
  }

  completePaymentCollection(
    paymentCollectionId: string,
    sharedContext?: Context
  ): Promise<PaymentCollectionDTO>
  completePaymentCollection(
    paymentCollectionId: string[],
    sharedContext?: Context
  ): Promise<PaymentCollectionDTO[]>

  @InjectTransactionManager("baseRepository_")
  async completePaymentCollection(
    paymentCollectionId: string | string[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentCollectionDTO | PaymentCollectionDTO[]> {
    const input = Array.isArray(paymentCollectionId)
      ? paymentCollectionId.map((id) => ({
          id,
          completed_at: new Date(),
        }))
      : [{ id: paymentCollectionId, completed_at: new Date() }]

    // TODO: what checks should be done here? e.g. captured_amount === amount?

    const updated = await this.paymentCollectionService_.update(
      input,
      sharedContext
    )

    return await this.baseRepository_.serialize(
      Array.isArray(paymentCollectionId) ? updated : updated[0],
      { populate: true }
    )
  }

  cancelPayment(paymentId: string, sharedContext?: Context): Promise<PaymentDTO>
  cancelPayment(
    paymentId: string[],
    sharedContext?: Context
  ): Promise<PaymentDTO[]>

  @InjectTransactionManager("baseRepository_")
  async cancelPayment(
    paymentId: string | string[],
    @MedusaContext() sharedContext?: Context
  ): Promise<PaymentDTO | PaymentDTO[]> {
    const input = Array.isArray(paymentId) ? paymentId : [paymentId]

    const payments = await this.paymentService_.list({ id: input })

    // TODO: revisit when totals are implemented
    // for (const payment of payments) {
    //   if (payment.captured_amount !== 0) {
    //     throw new MedusaError(
    //       MedusaError.Types.INVALID_DATA,
    //       `Cannot cancel a payment: ${payment.id} that has been captured.`
    //     )
    //   }
    // }

    await Promise.all(
      payments.map((payment) =>
        this.paymentProviderService_.cancelPayment({
          data: payment.data!,
          provider_id: payment.provider_id,
        })
      )
    )

    const updated = await this.paymentService_.update(
      input.map((id) => ({
        id,
        canceled_at: new Date(),
      })),
      sharedContext
    )

    return await this.baseRepository_.serialize(
      Array.isArray(paymentId) ? updated : updated[0],
      { populate: true }
    )
  }

  private async createProvidersOnLoad() {
    const providersToLoad = this.__container__["payment_providers"]

    const providers = await this.paymentProviderService_.list({
      // @ts-ignore TODO
      id: providersToLoad.map((p) => p.getIdentifier()),
    })

    const loadedProvidersMap = new Map(providers.map((p) => [p.id, p]))

    const providersToCreate: CreatePaymentProviderDTO[] = []

    for (const provider of providersToLoad) {
      if (loadedProvidersMap.has(provider.getIdentifier())) {
        continue
      }

      providersToCreate.push({
        id: provider.getIdentifier(),
      })
    }

    await this.paymentProviderService_.create(providersToCreate)
  }
}
