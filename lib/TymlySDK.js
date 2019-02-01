const Logs = require('./Logs')
const Startables = require('./Startables')
const Executions = require('./Executions')
const Settings = require('./Settings')
const Templates = require('./Templates')
const Search = require('./Search')
const Todo = require('./Todo')
const Watching = require('./Watching')
const Route = require('./Route')
const database = require('./database')
const uuidv1 = require('uuid/v1')
const shasum = require('shasum')

const USER_QUERY_KEYS = [
  'startables',
  'todo',
  'templates',
  'watching',
  'settings'
]

module.exports = class TymlyClient {
  constructor (options) {
    this.options = options
    const { indexedDB, IDBKeyRange } = options.globalVars
    this.db = database({ indexedDB, IDBKeyRange })
    options.auth.init(this)

    this.logs = new Logs(this)
    this.route = new Route(this)
    this.ready = false
  }

  /**
   * Initialise the SDK Client.
   */
  async init () {
    this.logs.applyPolicy()

    this.executions = new Executions(this)
    this.startables = new Startables(this)
    this.settings = new Settings(this)
    this.templates = new Templates(this)
    this.search = new Search(this)
    this.todo = new Todo(this)
    this.watching = new Watching(this)

    await this.requestUserQuery()

    this.options.auth.startRefreshTimer()
    this.ready = true
  }

  /**
   * Executes init if the client is not ready
   */
  _waitUntilReady () {
    return new Promise(async (resolve, reject) => {
      if (this.ready === true) {
        resolve()
      } else {
        try {
          await this.init()
          resolve()
        } catch (e) {
          reject(e)
        }
      }
    })
  }

  /**
   * Loads user query from server.
   */
  async requestUserQuery () {
    const userQuery = await this.getUserQuery()

    for (const key of USER_QUERY_KEYS) {
      await this[key].persistFromUserQuery(userQuery)
      await this[key].load()
    }
  }

  /**
   * Gets user query from server.
   */
  async getUserQuery () {
    const watching = await this.executions.execute({
      stateMachineName: 'tymly_getWatchedBoards_1_0',
      input: {},
      token: this.options.auth.token
    })

    const remit = await this.executions.execute({
      stateMachineName: 'tymly_getUserRemit_1_0',
      input: {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: [],
          formNames: {},
          startable: [],
          teams: [],
          todos: []
        }
      },
      token: this.options.auth.token
    })

    return {
      ...remit.ctx.userRemit,
      watching: watching.ctx.watchCategories
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
   * @param {string} data - The data to be hashed .
   * @returns {String} Returns the hash.
   */
  _getHash (data) {
    return shasum(data)
  }

  /**
   * Closes down running services.
   */
  destroy () {
    this.options.auth.cancelRefreshTimer()
  }
}
