/* eslint-env mocha */

'use strict'

const PORT = 3210
const TYMLY_API_URL = `http://localhost:${PORT}/executions`
const LOG_LIMIT = 10
const PRETEND_AUTH_SECRET = 'Shhh!!!'
const PRETEND_AUDIENCE = 'I am the audience'
const TYMLY_USERNAME = 'Dave'
const { TymlySDK, Auth0 } = require('../lib')
const vuexStore = require('./fixtures/store')
const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const setGlobalVars = require('indexeddbshim')
const Vuex = require('vuex')
const Vue = require('vue')
// const logLevels = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
// const util = require('util')
// const setTimeoutPromise = util.promisify(setTimeout)
const LOG_LEVELS = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']

let sdk, auth, tymlyServices, indexedDB, IDBKeyRange, store, todoId, watchId, execName, authToken, server

describe('Set up', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('boot Tymly', done => {
    tymly.boot(
      {
        pluginPaths: [
          require.resolve('@wmfs/tymly-express-plugin'),
          require.resolve('@wmfs/tymly-cardscript-plugin'),
          require.resolve('@wmfs/tymly-solr-plugin'),
          require.resolve('@wmfs/tymly-rbac-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './fixtures/pizza-blueprint'), // todo: refactor to import @wmfs/pizza-blueprint
          path.resolve(__dirname, './fixtures/clock-blueprint')
        ],
        config: {
          auth: {
            secret: PRETEND_AUTH_SECRET,
            audience: PRETEND_AUDIENCE
          },
          defaultUsers: {
            Dave: ['tymly_tymlyTestAdmin']
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
    server = tymlyServices.server
    server.listen(PORT, () => {
      console.log(`Tymly server listening at ${PORT}`)
      done()
    })
  })

  it('should get a token from the server service', () => {
    authToken = tymlyServices.jwtAuth.generateToken(TYMLY_USERNAME)
  })

  it('set up Auth', () => {
    auth = new Auth0(
      {
        domain: process.env.AUTH0_DOMAIN,
        grant_type: 'client_credentials',
        client_id: process.env.AUTH0_CLIENT_ID,
        connection: process.env.AUTH_CONNECTION
      }
    )
    //
    //
    //
    // auth = new Auth0({
    // domain: process.env.AUTH0_DOMAIN,
    // grant_type: 'client_credentials',
    // client_id: process.env.AUTH0_CLIENT_ID,
    // client_secret: process.env.AUTH0_CLIENT_SECRET,
    // audience: process.env.AUTH0_AUDIENCE,
    // imageUrl: 'https://tymlystorage.blob.core.windows.net/tymly-application/tymly-logo-150x150.png',
    // tokenRefresh: {
    //   seconds: 3,
    //   mode: 'REPEAT' // or ONCE
    // }
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

  it('initialise the TymlySDK', async () => {
    await sdk.init()
  })

  it('get an auth0 token', async () => {
    // authToken = await auth.setTokenFromRequest()

    await auth.setFromCallbackPayload(
      {
        idToken: authToken,
        accessToken: authToken,
        tokenType: 'bearer',
        scope: '????',
        idTokenPayload: {
          name: TYMLY_USERNAME,
          picture: `${TYMLY_USERNAME}.png`,
          email: `${TYMLY_USERNAME}@tymly.io`,
          sub: 'SUB?',
          exp: '1234567'
        }
      }
    )
  })

  it('Should simulate a sync', async () => {
    await sdk.requestUserQuery()
  })
})

describe('Info tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('should return undefined for unset value', async () => {
    const value = await sdk.info.get('unknown')
    expect(value).to.eql(undefined)
  })

  it('should set a string value', async () => {
    await sdk.info.set('name', 'Marge Simpson')
  })

  it('should return a known string value', async () => {
    const value = await sdk.info.get('name')
    expect(value).to.eql('Marge Simpson')
  })

  it('should set an object value', async () => {
    await sdk.info.set('details',
      {
        alive: true,
        age: 36,
        hairColor: 'Blue'
      }
    )
  })

  it('should return a known object value', async () => {
    const value = await sdk.info.get('details')
    expect(value).to.eql(
      {
        alive: true,
        age: 36,
        hairColor: 'Blue'
      }
    )
  })

  it('should get all info in an array', async () => {
    const value = await sdk.info.getAll()
    expect(value.length).to.be.gt(2)
  })

  it('should delete by id', async () => {
    await sdk.info.delete('name')
  })

  it('should return a known string value', async () => {
    const value = await sdk.info.get('name')
    expect(value).to.eql(undefined)
  })

  it('should clear all info', async () => {
    await sdk.info.clear()
  })

  it('should get empty array now everything has been cleared', async () => {
    const value = await sdk.info.getAll()
    expect(value).to.eql([])
  })
})

describe('General tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('load the logs from db to store', async () => {
    await sdk.logs.loadLogs({})
  })

  it('check if the vuex store has been populated', () => {
    const {
      startables,
      watching,
      todos,
      logs,
      favourites,
      settings
    } = store.state.app

    expect(logs.length).to.eql(0)
    expect(startables.length).to.eql(3)
    expect(watching.length).to.eql(0)
    expect(favourites.length).to.eql(0)
    expect(todos.length).to.eql(0)
    expect(settings.categoryRelevance).to.eql(['food', 'pizza', 'system'])
  })
})

describe('Favourites', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('should favourite a startable \'test_orderPizza_1_0\'', async () => {
    await sdk.startables.favourite('test_orderPizza_1_0')
  })

  it('check the vuex store if the favourite startable \'test_orderPizza_1_0\' has been added', () => {
    const { favourites } = store.state.app
    expect(favourites).to.eql(['test_orderPizza_1_0'])
  })

  it('check indexedDB if the favourite startable \'test_orderPizza_1_0 has been added\'', async () => {
    const { favourites } = await sdk.db.favourites.get('favourites')
    expect(favourites).to.eql(['test_orderPizza_1_0'])
  })

  it('check the favourites on the server for the added entry', async () => {
    const { ctx } = await sdk.executions.execute({
      stateMachineName: 'tymly_getFavouriteStartableNames_1_0',
      token: authToken
    })

    expect(ctx.results).to.eql(['test_orderPizza_1_0'])
  })

  it('should unfavourite a startable \'test_orderPizza_1_0\'', async () => {
    await sdk.startables.unfavourite('test_orderPizza_1_0')
  })

  it('check the vuex store if the favourite startable \'test_orderPizza_1_0\' has been removed', () => {
    const { favourites } = store.state.app
    expect(favourites).to.eql([])
  })

  it('check indexedDB if the favourite startable \'test_orderPizza_1_0 has been removed\'', async () => {
    const { favourites } = await sdk.db.favourites.get('favourites')
    expect(favourites).to.eql([])
  })

  it('check the favourites on the server for the removed entry', async () => {
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
    expect(settings.categoryRelevance).to.eql(['pizza', 'food'])
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

  it('watch \'test_orderPizza_1_0\' instance', async () => {
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

  it('refresh user query, check the watching entry exists', async () => {
    await sdk.requestUserQuery()

    const { watching } = store.state.app
    expect(watching.length).to.eql(1)
    expect(watching[0].subscriptionId).to.eql(watchId)
  })

  it('unwatch \'test_orderPizza_1_0\' instance', async () => {
    const { ctx } = await sdk.watching.unwatch(watchId)

    expect(ctx.subscriptionId).to.eql(watchId)
  })

  it('refresh user query, check the watching entry has been removed', async () => {
    await sdk.requestUserQuery()

    const { watching } = store.state.app
    expect(watching.length).to.eql(0)
  })
})

describe('Long Running Tasks', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  let clockExecutionName

  it('no long running tasks', async () => {
    await sdk.tasks.update(authToken)
    expect(sdk.tasks.complete.length).to.equal(0)
    expect(sdk.tasks.running.length).to.equal(0)
  })

  it('start clock', async () => {
    const { executionName } = await sdk.executions.execute({
      stateMachineName: 'clock_clockUi_1_0',
      input: { },
      sendResponse: 'AFTER_RESOURCE_CALLBACK.TYPE:awaitingHumanInput'
    })

    clockExecutionName = executionName
  })

  it('one task running', async () => {
    await sdk.tasks.update()

    expect(sdk.tasks.complete.length).to.equal(0)

    const running = sdk.tasks.running
    expect(running.length).to.equal(1)
    expect(running[0].executionName).to.equal(clockExecutionName)
  })

  it('stop clock', async () => {
    await sdk.executions.StopExecution(clockExecutionName)
  })

  it('one task completed', async () => {
    await sdk.tasks.update()

    expect(sdk.tasks.running.length).to.equal(0)

    const complete = sdk.tasks.complete
    expect(complete.length).to.equal(1)
    expect(complete[0].executionName).to.equal(clockExecutionName)
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
    const hasDataChanged = sdk.executions.hasDataChanged(execName, { code: 'PEPPERONI' })
    expect(hasDataChanged).to.eql(true)
  })
})

describe('Search', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  it('attempt to search for \'Kebab\'', async () => {
    await sdk.search.search({ query: 'Kebab' })
  })
})

describe('Logs', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  // clear the logs to start fresh?

  it(`add ${LOG_LIMIT + 2} logs where log limit is ${LOG_LIMIT}`, async () => {
    for (let i = 1; i <= LOG_LIMIT + 2; i++) {
      await sdk.logs.addLog({
        level: 'INFO',
        code: 'TEST',
        title: `Test ${i}`
      })
    }
  })

  it('load the logs from db to store', async () => {
    await sdk.logs.loadLogs({})
  })

  it('check the store for logs', async () => {
    const { logs } = store.state.app
    expect(logs.length).to.eql(12)
  })

  it('refresh logs from db to store', async () => {
    await sdk.logs.loadLogs({ offset: 10 })
  })

  it('apply policy on logs', async () => {
    await sdk.logs.applyPolicy()
  })

  it('load the logs to the store', async () => {
    await sdk.logs.loadLogs({})

    const { logs } = store.state.app
    expect(logs.length).to.eql(LOG_LIMIT)
  })

  it('should try to add log with unsupported level', async () => {
    try {
      await sdk.logs.addLog({
        level: 'NOT_SUPPORTED',
        code: 'TEST',
        title: 'Faulty log'
      })
    } catch (e) {
      expect(e instanceof TypeError)
    }
  })

  it('should clear all logs and add one per level', async () => {
    await sdk.logs.clearLogs()
    for (const level of LOG_LEVELS) {
      console.log('Adding log: ', level)
      await sdk.logs.addLog({
        level,
        code: `${level} TEST`,
        title: `${level} log`
      })
    }
  })

  it('Cycle log levels an see increasing levels of logs. See comment for explanation', async () => {
    // A log request of level p in a logger with level q is enabled if p >= q
    for (const level of LOG_LEVELS) {
      await sdk.logs.loadLogs({ logLevel: level })
      const { logs } = store.state.app
      expect(logs.length).eql(LOG_LEVELS.indexOf(level) + 1)
    }
  })

  it('Should get logs with logLevel = `ALL`', async () => {
    await sdk.logs.loadLogs({ logLevel: 'ALL' })
    const { logs } = store.state.app
    expect(logs.length).eql(logs.length)
  })

  it('Should get no logs with logLevel = `OFF`', async () => {
    await sdk.logs.loadLogs({ logLevel: 'OFF' })
    const { logs } = store.state.app
    expect(logs).eql([])
  })

  it('should try to get a `page` of logs with offset=0 and size=3', async () => {
    await sdk.logs.loadLogs({
      offset: 0,
      limit: 3,
      logLevel: 'ALL'
    })

    const { logs } = store.state.app
    expect(logs.length).eql(3)
  })
})

describe('Shut down', function () {
  it('shutdown Tymly', async () => {
    await tymlyServices.tymly.shutdown()
  })
})
