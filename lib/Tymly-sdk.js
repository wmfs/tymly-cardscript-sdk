const Stopwatch = require('./Stopwatch')
const Logs = require('./Logs')
const Categories = require('./Categories')
const Startables = require('./Startables')
const Executions = require('./Executions')
const Settings = require('./Settings')
const Templates = require('./Templates')
const Search = require('./Search')
const Suggestions = require('./Suggestions')
const Summary = require('./Summary')
const Todo = require('./Todo')
const Watching = require('./Watching')
const Info = require('./Info')
const Route = require('./Route')
const Tasks = require('./Tasks')
const Downloads = require('./Downloads')
const database = require('./database')
const { v1: uuidv1 } = require('uuid')
const shasum = require('shasum')

const USER_QUERY_KEYS = [
  'startables',
  'todo',
  'templates',
  'watching',
  'settings',
  'categories',
  'tasks'
]

module.exports = class TymlyClient {
  constructor (options) {
    this.options = options

    const { indexedDB, IDBKeyRange } = options.globalVars

    this.db = database({ indexedDB, IDBKeyRange })

    options.auth.init(this)
    this.auth = options.auth

    this.info = new Info(this)
    this.categories = new Categories(this)
    this.route = new Route(this)
    this.templates = new Templates(this)
    this.logs = new Logs(this)

    this.logs.applyPolicy()

    this.haveRunUserQuery = false
    this.sdkHasInitialized = false
  }

  /**
   * Initialise the SDK Client.
   * @param {string} options - Options to control the initialisation process.
   @returns {object} Returns the UUID.
   */
  async init () {
    console.log('Starting to init SDK...')
    await this.info.set('lastInitStart', new Date().toISOString())

    if (!this.options.auth.options.token) {
      const row = await this.db.auth.get('token')
      if (row) {
        const { value } = await this.db.auth.get('token')
        this.options.auth.token = value
      }
    }

    this.executions = new Executions(this)
    this.summary = new Summary(this)
    this.search = new Search(this)
    this.startables = new Startables(this)
    this.settings = new Settings(this)
    this.tasks = new Tasks(this)
    this.todo = new Todo(this)
    this.watching = new Watching(this)
    this.suggestions = new Suggestions(this)
    this.download = new Downloads(this)

    await Promise.all(USER_QUERY_KEYS.map(k => this[k].load()))

    this.sdkHasInitialized = true
    console.log('SDK INITIALIZED')
  }

  async ensureSdkIsReady () {
    if (!this.sdkHasInitialized) {
      await this.init()
    }
  }

  /**
   * Indicates if the app should run a user query, or not.
   * Returns:
   * {
   *   action: string (One of 'NEED_INIT', 'SYNC', 'NOSYNC')
   * }
   */
  async getSyncAction () {
    // TODO: This should look at 'info' timestamps, SHAs, all sorts.
    // (needs to be quick, called every route-change)
    const response = {}
    if (this.sdkHasInitialized) {
      if (this.haveRunUserQuery) {
        response.action = 'NOSYNC'
      } else {
        response.action = 'SYNC'
      }
    } else {
      response.action = 'NEED_INIT'
    }
    return response
  }

  /**
   * Executes init if the client is not ready
   */
  waitUntilReady () {
    return new Promise((resolve, reject) => {
      if (this.ready === true) {
        resolve()
      } else {
        this.init().then(resolve).catch(reject)
      }
    })
  }

  /**
   * Loads user query from server.
   * @param {string} requestKey - Optional key to only refresh.
   */
  async requestUserQuery (requestKey) {
    const stopwatch = new Stopwatch()

    // TODO: refactor so we don't get the whole userQuery if specific key provided
    const userQuery = await this.getUserQuery(stopwatch)

    const keys = requestKey ? [requestKey] : USER_QUERY_KEYS

    stopwatch.addTime('Persist from user query to indexed db')
    await Promise.all(keys.map(k => this[k].persistFromUserQuery(userQuery)))

    stopwatch.addTime('Load from indexed db to vuex store')
    await Promise.all(keys.map(k => this[k].load()))

    this.haveRunUserQuery = true

    stopwatch.addTime('Finished getting user query')

    const stopwatchResults = stopwatch.getResults()
    const stopwatchTotal = stopwatch.getTotal()

    console.log('')
    console.log('| Time taken | Task |')
    stopwatchResults.forEach(({ label, percentage }) => { console.log(`| ${percentage}% | ${label} |`) })
    console.log(`Total time to request user query: ${stopwatchTotal}ms`)
    console.log('')

    this.info.set('userQueryStopWatchResults', JSON.stringify(stopwatchResults))
    this.info.set('userQueryStopWatchTotalMs', stopwatchTotal)
  }

  /**
   * Gets user query from server.
   */
  async getUserQuery (stopwatch) {
    const { store, auth } = this.options
    const { token } = auth

    const {
      templates,
      startables,
      todos,
      categories
    } = store.state.app

    const clientManifest = {
      cardNames: templates.reduce((acc, curr) => {
        const name = `${curr.namespace}_${curr.name}_${curr.version.replace(/\./g, '_')}`
        acc[name] = curr.shasum
        return acc
      }, {}),
      startable: startables.reduce((acc, curr) => {
        acc[curr.name] = curr.shasum
        return acc
      }, {}),
      todos: todos.reduce((acc, curr) => {
        delete curr.shasum
        acc[curr.id] = shasum(JSON.stringify(curr))
        return acc
      }, {}),
      categoryNames: categories.map(x => x.category),
      teams: [] // todo e.g. ['Birmingham (Red watch)', 'Another team']
    }

    this.info.set('lastUserQueryStart', new Date().toISOString())

    stopwatch.addTime('Get watched boards, remit, long-running tasks')
    const [watching, remit, tasks] = await Promise.all([
      this.executions.execute({
        stateMachineName: 'tymly_getWatchedBoards_1_0',
        input: {},
        token
      }),
      this.executions.execute({
        stateMachineName: 'tymly_getUserRemit_1_0',
        input: { clientManifest },
        token
      }),
      this.tasks.update(token)
    ])

    this.info.set('lastUserQueryEnd', new Date().toISOString())

    return {
      ...remit.ctx.userRemit,
      watching: watching.ctx.watchCategories,
      tasks: tasks
    }
  }

  /**
   * Returns a generated UUID.
   * @returns {String} Returns the UUID.
   */
  _getUUID () {
    return uuidv1()
  }

  /**
   * Returns a generated hash on some passed in data.
   * @param {string} data - The data to be hashed.
   * @returns {String} Returns the hash.
   */
  _getHash (data) {
    return shasum(data)
  }

  /**
   * Detects if user might like to think-twice about destroying.
   */
  async destroyGuard () {
    const executions = await this.db.executions.toArray()
    let draftCount = 0
    let outboxCount = 0

    executions.forEach(
      (execution) => {
        switch (execution.localState) {
          case 'DRAFTS':
            draftCount++
            break
          case 'OUTBOX':
            outboxCount++
            break
        }
      }
    )

    let res
    const total = draftCount + outboxCount
    if (total === 0) {
      res = {
        intervene: false
      }
    } else {
      let message = 'You currently have '
      const parts = []

      let phrase
      // Drafts
      if (draftCount > 0) {
        phrase = `${draftCount} draft`
        if (draftCount > 1) {
          phrase += 's'
        }
        parts.push(phrase)
      }
      // Outbox
      if (outboxCount > 0) {
        phrase = `${outboxCount} unsent form`
        if (outboxCount > 1) {
          phrase += 's'
        }
        phrase += ' in your outbox'
        parts.push(phrase)
      }
      message = `${message} ${parts.join(' and ')}`
      const thisOrThese = total === 1 ? 'This' : 'These'

      message += `. ${thisOrThese} will be lost forever if you choose to continue logging out.`
      res = {
        intervene: true,
        interventionMessage: message
      }
    }

    return res
  }

  /**
   * Closes down running services.
   */
  async destroy () {
    this.options.store.commit('app/clear', {})
    this.options.store.commit('tracker/clear', {})
    this.haveRunUserQuery = false
    this.sdkHasInitialized = false
    await this.auth.clearStoredValues()
    await this.db.delete()
    await this.db.open()
  }
}
