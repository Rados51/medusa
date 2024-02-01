import { SqlEntityManager } from "@mikro-orm/postgresql"
import { asValue } from "awilix"
import { createMedusaContainer } from "@medusajs/utils"

import { PaymentProviderService } from "@services"

import { MikroOrmWrapper } from "../../../utils"
import ContainerLoader from "../../../../src/loaders/container"

jest.setTimeout(30000)

describe("Payment Provider Service", () => {
  let service: PaymentProviderService
  let testManager: SqlEntityManager
  let repositoryManager: SqlEntityManager

  beforeEach(async () => {
    await MikroOrmWrapper.setupDatabase()
    repositoryManager = await MikroOrmWrapper.forkManager()
    testManager = await MikroOrmWrapper.forkManager()

    const container = createMedusaContainer()
    container.register("manager", asValue(repositoryManager))

    await ContainerLoader({ container })

    service = container.resolve("paymentProviderService")
  })

  afterEach(async () => {
    await MikroOrmWrapper.clearDatabase()
  })

  describe("CRUD", () => {
    it("should create payment providers", async () => {
      let created = await service.create([
        { id: "stripe", is_enabled: false },
        { id: "paypal" },
      ])

      expect(created).toEqual(
        expect.arrayContaining([
          {
            is_enabled: false,
            id: "stripe",
          },
          {
            is_enabled: true,
            id: "paypal",
          },
        ])
      )
    })

    it("should list payment providers", async () => {
      await service.create([
        { id: "stripe", is_enabled: false },
        { id: "paypal" },
        { id: "manual" },
      ])

      const providers = await service.list()

      expect(providers).toEqual(
        expect.arrayContaining([
          {
            is_enabled: false,
            id: "stripe",
          },
          {
            is_enabled: true,
            id: "paypal",
          },
          {
            is_enabled: true,
            id: "manual",
          },
        ])
      )
    })
  })
})
