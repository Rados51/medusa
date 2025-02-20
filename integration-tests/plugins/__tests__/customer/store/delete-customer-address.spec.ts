import { initDb, useDb } from "../../../../environment-helpers/use-db"

import { ICustomerModuleService } from "@medusajs/types"
import { ModuleRegistrationName } from "@medusajs/modules-sdk"
import { createAuthenticatedCustomer } from "../../../helpers/create-authenticated-customer"
import { getContainer } from "../../../../environment-helpers/use-container"
import path from "path"
import { startBootstrapApp } from "../../../../environment-helpers/bootstrap-app"
import { useApi } from "../../../../environment-helpers/use-api"

const env = { MEDUSA_FF_MEDUSA_V2: true }

describe("DELETE /store/customers/me/addresses/:address_id", () => {
  let dbConnection
  let appContainer
  let shutdownServer
  let customerModuleService: ICustomerModuleService

  beforeAll(async () => {
    const cwd = path.resolve(path.join(__dirname, "..", "..", ".."))
    dbConnection = await initDb({ cwd, env } as any)
    shutdownServer = await startBootstrapApp({ cwd, env })
    appContainer = getContainer()
    customerModuleService = appContainer.resolve(
      ModuleRegistrationName.CUSTOMER
    )
  })

  // TODO: delete with removal of authProvider
  beforeEach(async () => {
    const onStart =
      appContainer.resolve(ModuleRegistrationName.AUTH).__hooks
        .onApplicationStart ?? (() => Promise.resolve())
    await onStart()
  })

  afterAll(async () => {
    const db = useDb()
    await db.shutdown()
    await shutdownServer()
  })

  afterEach(async () => {
    const db = useDb()
    await db.teardown()
  })

  it("should delete a customer address", async () => {
    const { jwt_secret } = appContainer.resolve("configModule").projectConfig
    const { customer, jwt } = await createAuthenticatedCustomer(
      customerModuleService,
      appContainer.resolve(ModuleRegistrationName.AUTH),
      jwt_secret
    )

    const address = await customerModuleService.addAddresses({
      customer_id: customer.id,
      first_name: "John",
      last_name: "Doe",
      address_1: "Test street 1",
    })

    const api = useApi() as any
    const response = await api.delete(
      `/store/customers/me/addresses/${address.id}`,
      { headers: { authorization: `Bearer ${jwt}` } }
    )

    expect(response.status).toEqual(200)

    const updatedCustomer = await customerModuleService.retrieve(customer.id, {
      relations: ["addresses"],
    })

    expect(updatedCustomer.addresses?.length).toEqual(0)
  })

  it("should fail to delete another customer's address", async () => {
    const { jwt_secret } = appContainer.resolve("configModule").projectConfig
    const { jwt } = await createAuthenticatedCustomer(
      customerModuleService,
      appContainer.resolve(ModuleRegistrationName.AUTH),
      jwt_secret
    )

    const otherCustomer = await customerModuleService.create({
      first_name: "Jane",
      last_name: "Doe",
    })
    const address = await customerModuleService.addAddresses({
      customer_id: otherCustomer.id,
      first_name: "John",
      last_name: "Doe",
      address_1: "Test street 1",
    })

    const api = useApi() as any
    const response = await api
      .delete(`/store/customers/me/addresses/${address.id}`, {
        headers: { authorization: `Bearer ${jwt}` },
      })
      .catch((e) => e.response)

    expect(response.status).toEqual(404)
  })
})
