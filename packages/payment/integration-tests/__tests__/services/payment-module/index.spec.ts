import { IPaymentModuleService } from "@medusajs/types"
import { SqlEntityManager } from "@mikro-orm/postgresql"

import { initialize } from "../../../../src"
import { DB_URL, MikroOrmWrapper } from "../../../utils"
import {
  createPaymentCollections,
  createPaymentSessions,
  createPayments,
} from "../../../__fixtures__"
import { getInitModuleConfig } from "../../../utils/get-init-module-config"
import { initModules } from "medusa-test-utils"
import { Modules } from "@medusajs/modules-sdk"

jest.setTimeout(30000)

describe("Payment Module Service", () => {
  let service: IPaymentModuleService

  describe("Payment Module Flow", () => {
    let repositoryManager: SqlEntityManager
    let shutdownFunc: () => Promise<void>

    beforeAll(async () => {
      const initModulesConfig = getInitModuleConfig()

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      service = medusaApp.modules[Modules.PAYMENT]

      shutdownFunc = shutdown
    })

    afterAll(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      await MikroOrmWrapper.setupDatabase()
      repositoryManager = await MikroOrmWrapper.forkManager()

      service = await initialize({
        database: {
          clientUrl: DB_URL,
          schema: process.env.MEDUSA_PAYMNET_DB_SCHEMA,
        },
      })

      if (service.__hooks?.onApplicationStart) {
        await service.__hooks.onApplicationStart()
      }

      await createPaymentCollections(repositoryManager)
      await createPaymentSessions(repositoryManager)
      await createPayments(repositoryManager)
    })

    afterEach(async () => {
      await MikroOrmWrapper.clearDatabase()
    })

    it("complete payment flow successfully", async () => {
      let paymentCollection = await service.createPaymentCollection({
        currency_code: "USD",
        amount: 200,
        region_id: "reg_123",
      })

      const paymentSession = await service.createPaymentSession(
        paymentCollection.id,
        { amount: 200, provider_id: "system", currency_code: "USD", data: {} }
      )

      await service.authorizePaymentCollection(
        paymentCollection.id,
        [paymentSession.id],
        {}
      )

      paymentCollection = await service.retrievePaymentCollection(
        paymentCollection.id,
        { relations: ["payments"] }
      )

      await service.capturePayment({
        amount: 200,
        payment_id: paymentCollection.payments![0].id,
      })

      await service.completePaymentCollection(paymentCollection.id)

      paymentCollection = await service.retrievePaymentCollection(
        paymentCollection.id,
        { relations: ["payment_sessions", "payments.captures"] }
      )

      expect(paymentCollection).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          currency_code: "USD",
          amount: 200,
          authorized_amount: 200,
          refunded_amount: null,
          region_id: "reg_123",
          deleted_at: null,
          completed_at: expect.any(Date),
          status: "authorized",
          payment_sessions: [
            expect.objectContaining({
              id: expect.any(String),
              currency_code: "USD",
              amount: 200,
              provider_id: "system",
              status: "authorized",
              authorized_at: expect.any(Date),
            }),
          ],
          payments: [
            expect.objectContaining({
              id: expect.any(String),
              amount: 200,
              currency_code: "USD",
              provider_id: "system",
              captures: [
                expect.objectContaining({
                  amount: 200,
                }),
              ],
            }),
          ],
        })
      )
    })
  })

  describe("PaymentCollection", () => {
    let repositoryManager: SqlEntityManager
    let shutdownFunc: () => Promise<void>

    beforeAll(async () => {
      const initModulesConfig = getInitModuleConfig()

      const { medusaApp, shutdown } = await initModules(initModulesConfig)

      service = medusaApp.modules[Modules.PAYMENT]

      shutdownFunc = shutdown
    })

    afterAll(async () => {
      await shutdownFunc()
    })

    beforeEach(async () => {
      await MikroOrmWrapper.setupDatabase()
      repositoryManager = await MikroOrmWrapper.forkManager()

      service = await initialize({
        database: {
          clientUrl: DB_URL,
          schema: process.env.MEDUSA_PAYMNET_DB_SCHEMA,
        },
      })

      if (service.__hooks?.onApplicationStart) {
        await service.__hooks.onApplicationStart()
      }

      await createPaymentCollections(repositoryManager)
      await createPaymentSessions(repositoryManager)
      await createPayments(repositoryManager)
    })

    afterEach(async () => {
      await MikroOrmWrapper.clearDatabase()
    })

    describe("create", () => {
      it("should throw an error when required params are not passed", async () => {
        let error = await service
          .createPaymentCollection([
            {
              amount: 200,
              region_id: "req_123",
            } as any,
          ])
          .catch((e) => e)

        expect(error.message).toContain(
          "Value for PaymentCollection.currency_code is required, 'undefined' found"
        )

        error = await service
          .createPaymentCollection([
            {
              currency_code: "USD",
              region_id: "req_123",
            } as any,
          ])
          .catch((e) => e)

        expect(error.message).toContain(
          "Value for PaymentCollection.amount is required, 'undefined' found"
        )

        error = await service
          .createPaymentCollection([
            {
              currency_code: "USD",
              amount: 200,
            } as any,
          ])
          .catch((e) => e)

        expect(error.message).toContain(
          "Value for PaymentCollection.region_id is required, 'undefined' found"
        )
      })

      it("should create a payment collection successfully", async () => {
        const [createdPaymentCollection] =
          await service.createPaymentCollection([
            { currency_code: "USD", amount: 200, region_id: "reg_123" },
          ])

        expect(createdPaymentCollection).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            status: "not_paid",
            payment_providers: [],
            payment_sessions: [],
            payments: [],
            currency_code: "USD",
            amount: 200,
          })
        )
      })
    })

    describe("delete", () => {
      it("should delete a Payment Collection", async () => {
        let collection = await service.listPaymentCollections({
          id: ["pay-col-id-1"],
        })

        expect(collection.length).toEqual(1)

        await service.deletePaymentCollections(["pay-col-id-1"])

        collection = await service.listPaymentCollections({
          id: ["pay-col-id-1"],
        })

        expect(collection.length).toEqual(0)
      })
    })

    describe("retrieve", () => {
      it("should retrieve a Payment Collection", async () => {
        let collection = await service.retrievePaymentCollection("pay-col-id-2")

        expect(collection).toEqual(
          expect.objectContaining({
            id: "pay-col-id-2",
            amount: 200,
            region_id: "region-id-1",
            currency_code: "usd",
          })
        )
      })

      it("should fail to retrieve a non existent Payment Collection", async () => {
        let error = await service
          .retrievePaymentCollection("pay-col-id-not-exists")
          .catch((e) => e)

        expect(error.message).toContain(
          "PaymentCollection with id: pay-col-id-not-exists was not found"
        )
      })
    })

    describe("list", () => {
      it("should list and count Payment Collection", async () => {
        let [collections, count] =
          await service.listAndCountPaymentCollections()

        expect(count).toEqual(3)

        expect(collections).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: "pay-col-id-1",
              amount: 100,
              region_id: "region-id-1",
              currency_code: "usd",
            }),
            expect.objectContaining({
              id: "pay-col-id-2",
              amount: 200,
              region_id: "region-id-1",
              currency_code: "usd",
            }),
            expect.objectContaining({
              id: "pay-col-id-3",
              amount: 300,
              region_id: "region-id-2",
              currency_code: "usd",
            }),
          ])
        )
      })

      it("should list Payment Collections by region_id", async () => {
        let collections = await service.listPaymentCollections(
          {
            region_id: "region-id-1",
          },
          { select: ["id", "amount", "region_id"] }
        )

        expect(collections.length).toEqual(2)

        expect(collections).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: "pay-col-id-1",
              amount: 100,
              region_id: "region-id-1",
            }),
            expect.objectContaining({
              id: "pay-col-id-2",
              amount: 200,
              region_id: "region-id-1",
            }),
          ])
        )
      })
    })

    describe("update", () => {
      it("should update a Payment Collection", async () => {
        await service.updatePaymentCollection({
          id: "pay-col-id-2",
          currency_code: "eur",
          authorized_amount: 200,
        })

        const collection = await service.retrievePaymentCollection(
          "pay-col-id-2"
        )

        expect(collection).toEqual(
          expect.objectContaining({
            id: "pay-col-id-2",
            authorized_amount: 200,
            currency_code: "eur",
          })
        )
      })
    })

    describe("complete", () => {
      it("should complete a Payment Collection", async () => {
        await service.completePaymentCollection("pay-col-id-1")

        const collection = await service.retrievePaymentCollection(
          "pay-col-id-1"
        )

        expect(collection).toEqual(
          expect.objectContaining({
            id: "pay-col-id-1",
            completed_at: expect.any(Date),
          })
        )
      })
    })
  })

  describe("PaymentSession", () => {
    let repositoryManager: SqlEntityManager

    beforeEach(async () => {
      await MikroOrmWrapper.setupDatabase()
      repositoryManager = await MikroOrmWrapper.forkManager()

      service = await initialize({
        database: {
          clientUrl: DB_URL,
          schema: process.env.MEDUSA_PAYMNET_DB_SCHEMA,
        },
      })

      if (service.__hooks?.onApplicationStart) {
        await service.__hooks.onApplicationStart()
      }

      await createPaymentCollections(repositoryManager)
      await createPaymentSessions(repositoryManager)
    })

    afterEach(async () => {
      await MikroOrmWrapper.clearDatabase()
    })

    describe("create", () => {
      it("should create a payment session successfully", async () => {
        await service.createPaymentSession("pay-col-id-1", {
          amount: 200,
          provider_id: "system",
          currency_code: "usd",
          data: {},
        })

        const paymentCollection = await service.retrievePaymentCollection(
          "pay-col-id-1",
          { relations: ["payment_sessions"] }
        )

        expect(paymentCollection).toEqual(
          expect.objectContaining({
            id: "pay-col-id-1",
            status: "not_paid",
            payment_sessions: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                data: {},
                status: "pending",
                authorized_at: null,
                currency_code: "usd",
                amount: 200,
                provider_id: "system",
              }),
            ]),
          })
        )
      })
    })

    describe("authorize", () => {
      it("should authorize payment sessions successfully", async () => {
        const collection = await service.createPaymentCollection({
          amount: 200,
          region_id: "test-region",
          currency_code: "usd",
        })

        const sessions = await service.createPaymentSession(collection.id, [
          {
            amount: 100,
            currency_code: "usd",
            provider_id: "system",
            data: {},
          },
          {
            amount: 100,
            currency_code: "usd",
            provider_id: "system",
            data: {},
          },
        ])

        await service.authorizePaymentCollection(
          collection.id,
          sessions.map(({ id }) => id),
          {}
        )

        const authorizedCollection = await service.retrievePaymentCollection(
          collection.id,
          { relations: ["payment_sessions", "payments"] }
        )

        expect(authorizedCollection).toEqual(
          expect.objectContaining({
            id: collection.id,
            amount: 200,
            authorized_amount: 200,
            payment_sessions: expect.arrayContaining([
              expect.objectContaining({
                id: sessions[0].id,
                amount: 100,
                provider_id: "system",
                data: {},
                status: "authorized",
                authorized_at: expect.any(Date),
              }),
              expect.objectContaining({
                id: sessions[1].id,
                amount: 100,
                provider_id: "system",
                data: {},
                status: "authorized",
                authorized_at: expect.any(Date),
              }),
            ]),
            payments: expect.arrayContaining([
              // Payments were created from the sessions
              expect.objectContaining({
                payment_session: expect.objectContaining({
                  id: sessions[0].id,
                }),
                amount: 100,
                authorized_amount: 100,
                currency_code: "usd",
                provider_id: "system",
              }),
              expect.objectContaining({
                payment_session: expect.objectContaining({
                  id: sessions[1].id,
                }),
                amount: 100,
                authorized_amount: 100,
                currency_code: "usd",
                provider_id: "system",
              }),
            ]),
          })
        )
      })
    })

    describe("set sessions", () => {
      it("should set sessions on a collection", async () => {
        let collection = await service.createPaymentCollection({
          amount: 200,
          region_id: "test-region",
          currency_code: "usd",
        })

        await service.setPaymentSessions(
          collection.id,
          [
            { amount: 100, provider_id: "system" },
            { amount: 100, provider_id: "system" },
          ],
          {
            resource_id: "todo",
            email: "asd",
            context: {},
            billing_address: {},
            customer: {},
          }
        )

        collection = await service.retrievePaymentCollection(collection.id, {
          relations: ["payment_sessions"],
        })

        expect(collection.payment_sessions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              currency_code: "usd",
              amount: 100,
              provider_id: "system",
              data: {},
              status: "pending",
              authorized_at: null,
              payment: null,
            }),
            expect.objectContaining({
              currency_code: "usd",
              amount: 100,
              provider_id: "system",
              data: {},
              status: "pending",
              authorized_at: null,
              payment: null,
            }),
          ])
        )
      })
    })
  })

  describe("Payment", () => {
    let repositoryManager: SqlEntityManager

    beforeEach(async () => {
      await MikroOrmWrapper.setupDatabase()
      repositoryManager = await MikroOrmWrapper.forkManager()

      service = await initialize({
        database: {
          clientUrl: DB_URL,
          schema: process.env.MEDUSA_PAYMNET_DB_SCHEMA,
        },
      })

      if (service.__hooks?.onApplicationStart) {
        await service.__hooks.onApplicationStart()
      }

      await createPaymentCollections(repositoryManager)
      await createPaymentSessions(repositoryManager)
      await createPayments(repositoryManager)
    })

    afterEach(async () => {
      await MikroOrmWrapper.clearDatabase()
    })

    describe("create", () => {
      it("should create a payment successfully", async () => {
        const paymentCollection = await service.createPaymentCollection({
          currency_code: "usd",
          amount: 200,
          region_id: "reg",
        })

        const session = await service.createPaymentSession(
          paymentCollection.id,
          {
            amount: 200,
            provider_id: "manual",
            currency_code: "usd",
            data: {},
          }
        )

        const createdPayment = await service.createPayment({
          data: {},
          amount: 200,
          provider_id: "manual",
          currency_code: "usd",
          payment_collection_id: paymentCollection.id,
          payment_session_id: session.id,
        })

        expect(createdPayment).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            authorized_amount: null,
            cart_id: null,
            order_id: null,
            order_edit_id: null,
            customer_id: null,
            data: {},
            deleted_at: null,
            captured_at: null,
            canceled_at: null,
            refunds: [],
            captures: [],
            amount: 200,
            currency_code: "usd",
            provider_id: "manual",
            payment_collection: expect.objectContaining({
              id: paymentCollection.id,
            }),
            payment_session: expect.objectContaining({
              id: paymentCollection.payment_sessions![0].id,
            }),
          })
        )
      })
    })

    describe("update", () => {
      it("should update a payment successfully", async () => {
        const updatedPayment = await service.updatePayment({
          id: "pay-id-1",
          cart_id: "new-cart",
        })

        expect(updatedPayment).toEqual(
          expect.objectContaining({
            id: "pay-id-1",
            cart_id: "new-cart",
          })
        )
      })
    })

    describe("capture", () => {
      it("should capture a payment successfully", async () => {
        const capturedPayment = await service.capturePayment({
          amount: 100,
          payment_id: "pay-id-1",
        })

        expect(capturedPayment).toEqual(
          expect.objectContaining({
            id: "pay-id-1",
            amount: 100,

            captures: [
              expect.objectContaining({
                created_by: null,
                amount: 100,
              }),
            ],

            // TODO: uncomment when totals calculations are implemented
            // captured_amount: 100,
            // captured_at: expect.any(Date),
          })
        )
      })

      it("should capture payments in bulk successfully", async () => {
        const capturedPayments = await service.capturePayment([
          {
            amount: 50, // partially captured
            payment_id: "pay-id-1",
          },
          {
            amount: 100, // fully captured
            payment_id: "pay-id-2",
          },
        ])

        expect(capturedPayments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: "pay-id-1",
              amount: 100,
              authorized_amount: 100,
              captured_at: null,
              captures: [
                expect.objectContaining({
                  created_by: null,
                  amount: 50,
                }),
              ],
              // captured_amount: 50,
            }),
            expect.objectContaining({
              id: "pay-id-2",
              amount: 100,
              authorized_amount: 100,
              // captured_at: expect.any(Date),
              captures: [
                expect.objectContaining({
                  created_by: null,
                  amount: 100,
                }),
              ],
              // captured_amount: 100,
            }),
          ])
        )
      })

      // TODO: uncomment when totals are implemented
      // it("should fail to capture payments in bulk if one of the captures fail", async () => {
      //   const error = await service
      //     .capturePayment([
      //       {
      //         amount: 50,
      //         payment_id: "pay-id-1",
      //       },
      //       {
      //         amount: 200, // exceeds authorized amount
      //         payment_id: "pay-id-2",
      //       },
      //     ])
      //     .catch((e) => e)
      //
      //   expect(error.message).toEqual(
      //     "Total captured amount for payment: pay-id-2 exceeds authorized amount."
      //   )
      // })

    //   it("should fail to capture amount greater than authorized", async () => {
    //     const error = await service
    //       .capturePayment({
    //         amount: 200,
    //         payment_id: "pay-id-1",
    //       })
    //       .catch((e) => e)
    //
    //     expect(error.message).toEqual(
    //       "Total captured amount for payment: pay-id-1 exceeds authorised amount."
    //     )
    //   })
    //
    //   it("should fail to capture already captured payment", async () => {
    //     await service.capturePayment({
    //       amount: 100,
    //       payment_id: "pay-id-1",
    //     })
    //
    //     const error = await service
    //       .capturePayment({
    //         amount: 100,
    //         payment_id: "pay-id-1",
    //       })
    //       .catch((e) => e)
    //
    //     expect(error.message).toEqual(
    //       "The payment: pay-id-1 is already fully captured."
    //     )
    //   })
    //
    //   it("should fail to capture a canceled payment", async () => {
    //     await service.cancelPayment("pay-id-1")
    //
    //     const error = await service
    //       .capturePayment({
    //         amount: 100,
    //         payment_id: "pay-id-1",
    //       })
    //       .catch((e) => e)
    //
    //     expect(error.message).toEqual(
    //       "The payment: pay-id-1 has been canceled."
    //     )
    //   })
    // })

    describe("refund", () => {
      it("should refund a payments in bulk successfully", async () => {
        await service.capturePayment({
          amount: 100,
          payment_id: "pay-id-1",
        })

        await service.capturePayment({
          amount: 100,
          payment_id: "pay-id-2",
        })

        const refundedPayment = await service.refundPayment([
          {
            amount: 100,
            payment_id: "pay-id-1",
          },
          {
            amount: 100,
            payment_id: "pay-id-2",
          },
        ])

        expect(refundedPayment).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: "pay-id-1",
              amount: 100,
              refunds: [
                expect.objectContaining({
                  created_by: null,
                  amount: 100,
                }),
              ],
              // captured_amount: 100,
              // refunded_amount: 100,
            }),
            expect.objectContaining({
              id: "pay-id-2",
              amount: 100,
              refunds: [
                expect.objectContaining({
                  created_by: null,
                  amount: 100,
                }),
              ],
              // captured_amount: 100,
              // refunded_amount: 100,
            }),
          ])
        )
      })

      // it("should throw if refund is greater than captured amount", async () => {
      //   await service.capturePayment({
      //     amount: 50,
      //     payment_id: "pay-id-1",
      //   })
      //
      //   const error = await service
      //     .refundPayment({
      //       amount: 100,
      //       payment_id: "pay-id-1",
      //     })
      //     .catch((e) => e)
      //
      //   expect(error.message).toEqual(
      //     "Refund amount for payment: pay-id-1 cannot be greater than the amount captured on the payment."
      //   )
      // })
    })

    describe("cancel", () => {
      it("should cancel a payment", async () => {
        const payment = await service.cancelPayment("pay-id-1")

        expect(payment).toEqual(
          expect.objectContaining({
            id: "pay-id-1",
            canceled_at: expect.any(Date),
          })
        )
      })

      it("should throw if trying to cancel a captured payment", async () => {
        await service.capturePayment({ payment_id: "pay-id-2", amount: 100 })

        const error = await service
          .cancelPayment("pay-id-2")
          .catch((e) => e.message)

        expect(error).toEqual(
          "Cannot cancel a payment: pay-id-2 that has been captured."
        )
      })
    })
  })
})
