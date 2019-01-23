/* eslint-env mocha */

'use strict'

const PORT = 3210
const TYMLY_API_URL = `http://localhost:${PORT}/executions`
const LOG_LIMIT = 10

const { TymlySDK, Auth0 } = require('../lib')
const vuexStore = require('./fixtures/store')
const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const setGlobalVars = require('indexeddbshim')
const Vuex = require('vuex')
const Vue = require('vue')

let sdk, auth, tymlyServices, indexedDB, IDBKeyRange, store, todoId, watchId, execName, authToken

describe('Set up', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  before(function () {
    if (!(
      process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_AUDIENCE &&
      process.env.TYMLY_CERT_PATH // `https://${process.env.AUTH0_DOMAIN}.auth0.com/pem`
    )) {
      this.skip()
    }
  })

  it('boot Tymly', done => {
    tymly.boot(
      {
        pluginPaths: [
          require.resolve('@wmfs/tymly-express-plugin'),
          require.resolve('@wmfs/tymly-users-plugin'),
          require.resolve('@wmfs/tymly-solr-plugin'),
          require.resolve('@wmfs/tymly-rbac-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './fixtures/pizza-blueprint') // todo: refactor to import @wmfs/pizza-blueprint
        ],
        config: {
          auth: {
            certificate: process.env.TYMLY_CERT_PATH,
            audience: process.env.AUTH0_AUDIENCE
          },
          defaultUsers: {
            'Dave': ['tymly_tymlyTestAdmin']
          }
        }
      },
      (err, services) => {
        expect(err).to.eql(null)
        tymlyServices = services
        done()
      }
    )
  })

  it('start Tymly server', done => {
    const { server } = tymlyServices
    server.listen(PORT, () => {
      console.log(`Tymly server listening at ${PORT}`)
      done()
    })
  })

  it('set up Auth', () => {
    auth = new Auth0({
      domain: process.env.AUTH0_DOMAIN,
      grant_type: 'client_credentials',
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      imageUrl: 'https://tymlystorage.blob.core.windows.net/tymly-application/tymly-logo-150x150.png',
      tokenRefresh: {
        seconds: 10,
        mode: 'ONCE' // or REPEAT
      }
    })
  })

  it('set up IndexedDB shim', () => {
    const shim = {}
    global.window = global
    setGlobalVars(shim, { checkOrigin: false, memoryDatabase: ':memory:' })
    indexedDB = shim.indexedDB
    IDBKeyRange = shim.IDBKeyRange

    // indexedDB.__debug(true)
  })

  it('set up the Vuex store', () => {
    Vue.use(Vuex)
    store = new Vuex.Store(vuexStore)
  })

  it('set up the TymlySDK', () => {
    sdk = new TymlySDK({
      logLimit: LOG_LIMIT,
      tymlyApiUrl: TYMLY_API_URL,
      appName: 'sdk-tests',
      auth,
      globalVars: {
        indexedDB,
        IDBKeyRange,
        console,
        setTimeout
      },
      store
    })
  })

  it('get an auth0 token', async () => {
    authToken = await auth.setTokenFromRequest()
  })

  // wait 10 seconds
  // check token has changed

  it('initialise the TymlySDK', done => {
    sdk
      .init()
      .then(() => {
        done()
      })
      .catch(err => {
        done(err)
      })
  })
})

describe('General tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('load the logs from db to store', async () => {
    await sdk.logs.loadLogs()
  })

  it('load the auth token from db to store', async () => {
    await auth.loadToken()
  })

  it('check if the vuex store has been populated', () => {
    const {
      startables,
      watching,
      todos,
      templates,
      logs,
      favourites,
      settings
    } = store.state.app

    const {
      token
    } = store.state.auth

    expect(token).to.not.eql(null)
    expect(logs.length).to.eql(1)
    expect(templates.length).to.eql(1)
    expect(startables.length).to.eql(3)
    expect(watching.length).to.eql(0)
    expect(favourites.length).to.eql(0)
    expect(todos.length).to.eql(0)
    expect(settings.categoryRelevance).to.eql(['food', 'pizza'])
  })
})

describe('Favourites', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it(`should favourite a startable 'test_orderPizza_1_0'`, async () => {
    await sdk.startables.favourite('test_orderPizza_1_0')
  })

  it(`check the vuex store if the favourite startable 'test_orderPizza_1_0' has been added`, () => {
    const { favourites } = store.state.app
    expect(favourites).to.eql(['test_orderPizza_1_0'])
  })

  it(`check indexedDB if the favourite startable 'test_orderPizza_1_0 has been added'`, async () => {
    const { favourites } = await sdk.db.favourites.get('favourites')
    expect(favourites).to.eql(['test_orderPizza_1_0'])
  })

  it(`check the favourites on the server for the added entry`, async () => {
    const { ctx } = await sdk.executions.execute({
      stateMachineName: 'tymly_getFavouriteStartableNames_1_0',
      token: authToken
    })

    expect(ctx.results).to.eql([ 'test_orderPizza_1_0' ])
  })

  it(`should unfavourite a startable 'test_orderPizza_1_0'`, async () => {
    await sdk.startables.unfavourite('test_orderPizza_1_0')
  })

  it(`check the vuex store if the favourite startable 'test_orderPizza_1_0' has been removed`, () => {
    const { favourites } = store.state.app
    expect(favourites).to.eql([])
  })

  it(`check indexedDB if the favourite startable 'test_orderPizza_1_0 has been removed'`, async () => {
    const { favourites } = await sdk.db.favourites.get('favourites')
    expect(favourites).to.eql([])
  })

  it(`check the favourites on the server for the removed entry`, async () => {
    const { ctx } = await sdk.executions.execute({
      stateMachineName: 'tymly_getFavouriteStartableNames_1_0',
      token: authToken
    })

    expect(ctx.results).to.eql([])
  })
})

describe('Settings', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('apply the adjsuted settings', async () => {
    await sdk.settings.apply({ categoryRelevance: ['pizza', 'food'] })
  })

  it('check the settings have changed in the db', async () => {
    const { settings } = await sdk.db.settings.get('settings')
    expect(settings.categoryRelevance).to.eql([ 'pizza', 'food' ])
  })
})

describe('To-dos', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('create todo entry for Prepare Pizza', async () => {
    const { ctx } = await sdk.executions.execute({
      stateMachineName: 'tymly_createTodoEntry_1_0',
      input: {
        todoTitle: 'Prepare Pizza',
        stateMachineTitle: 'Prepare Pizza',
        stateMachineCategory: 'pizza',
        description: 'You need to begin preparing the pizza.'
      },
      token: authToken
    })

    todoId = ctx.idProperties.id
  })

  it('refresh user query, check new todo entry exists', async () => {
    await sdk.requestUserQuery()

    const { todos } = store.state.app
    expect(todos.length).to.eql(1)
    expect(todos[0].id).to.eql(todoId)
  })

  it('remove the todo entry', async () => {
    await sdk.todo.remove(todoId)
    await sdk.requestUserQuery()

    const { todos } = store.state.app
    expect(todos.length).to.eql(0)
  })
})

describe('Watching', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it(`watch 'test_orderPizza_1_0' instance`, async () => {
    const { ctx } = await sdk.watching.watch({
      stateMachineName: 'test_orderPizza_1_0',
      title: 'Pizza Order XYZ123', // Get from card
      category: 'Food',
      categoryLabel: 'Food Order',
      description: 'Pepperoni and Jalapeno Pizza',
      launches: [{
        stateMachineName: 'test_viewPizzaOrder_1_0',
        input: {
          boardKeys: {
            pizzaId: 'XYZ123'
          }
        }
      }]
    })

    watchId = ctx.subscriptionId
  })

  it(`refresh user query, check the watching entry exists`, async () => {
    await sdk.requestUserQuery()

    const { watching } = store.state.app
    expect(watching.length).to.eql(1)
    expect(watching[0].subscriptionId).to.eql(watchId)
  })

  it(`unwatch 'test_orderPizza_1_0' instance`, async () => {
    const { ctx } = await sdk.watching.unwatch({
      subscriptionId: watchId
    })

    expect(ctx.subscriptionId).to.eql(watchId)
  })

  it(`refresh user query, check the watching entry exists`, async () => {
    await sdk.requestUserQuery()

    const { watching } = store.state.app
    expect(watching.length).to.eql(0)
  })
})

describe('Executions', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('check the executions store in the db', async () => {
    const data = await sdk.db.executions.toArray()
    expect(data.length).to.eql(19)

    execName = data[0].executionName
  })

  it('check if valid execution name exists in db', async () => {
    const exists = await sdk.executions.exists(execName)
    expect(exists).to.eql(true)
  })

  it('check if invalid execution name exists in db', async () => {
    const exists = await sdk.executions.exists('FakeExecutionName')
    expect(exists).to.eql(false)
  })

  it('load execution into store', async () => {
    await sdk.executions.load(execName)
    const { execution } = store.state.app
    expect(execution.executionName).to.eql(execName)
  })

  it('start form filling state machine and load as current execution', async () => {
    const execDesc = await sdk.executions.execute({
      stateMachineName: 'test_orderPizza_1_0',
      input: {},
      sendResponse: 'AFTER_RESOURCE_CALLBACK.TYPE:awaitingHumanInput',
      token: authToken
    })

    expect(execDesc.status).to.eql('RUNNING')
    await sdk.executions.load(execDesc.executionName)
    execName = execDesc.executionName
  })

  it('populate some form data', async () => {
    await sdk.executions.SendTaskSuccess({
      executionName: execName,
      output: {
        code: 'CHEESE_TOMATO'
      },
      token: authToken
    })

    // check data in model in tymly
  })

  // it('try the hasDataChanged function with same data', async () => {
  //   const hasDataChanged = sdk.executions.hasDataChanged(execName, {
  //     code: 'CHEESE_TOMATO'
  //   })
  //   expect(hasDataChanged).to.eql(false)
  // })

  it('try the hasDataChanged function with different data', async () => {
    const hasDataChanged = sdk.executions.hasDataChanged(execName, {
      code: 'PEPPERONI'
    })
    expect(hasDataChanged).to.eql(true)
  })
})

describe('Search', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it(`attempt to search for 'Kebab'`, async () => {
    await sdk.search.search({
      query: 'Kebab'
    })
  })
})

describe('Logs', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  // clear the logs to start fresh?

  it(`add ${LOG_LIMIT + 2} logs`, async () => {
    for (let i = 1; i <= LOG_LIMIT + 2; i++) {
      await sdk.logs.addLog({
        type: 'POSITIVE',
        code: 'TEST',
        title: `Test ${i}`
      })
    }
  })

  it('load the logs from db to store', async () => {
    await sdk.logs.loadLogs()
  })

  it('check the store for the new logs', () => {
    const { logs } = store.state.app
    expect(logs.length).to.eql(LOG_LIMIT + 3)
  })

  it('apply policy on logs', async () => {
    await sdk.logs.applyPolicy()
  })

  it('load the logs to the store', async () => {
    await sdk.logs.loadLogs()

    const { logs } = store.state.app
    expect(logs.length).to.eql(LOG_LIMIT)
  })
})

describe('Shut down', function () {
  it('shutdown Tymly', async () => {
    await tymlyServices.tymly.shutdown()
  })
})
