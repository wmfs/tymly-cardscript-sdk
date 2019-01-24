const takeRight = require('lodash.takeright')

module.exports = class Logs {
  /**
   * Constructor for Logs class, instantiated within the constructor for Tymly SDK. Inspired by https://www.tutorialspoint.com/log4j/log4j_logging_levels.htm
   * @param {Client} client Instance of Tymly SDK to talk to
   * @example
    this.logs = new Logs(this)
   */
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.limit = client.options.logLimit
    this.shim = client.options.globalVars.indexedDB

    // Ordered by level of log4j for reference
    this.logLevels = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
  }

  /**
   * Add a formatted log to indexedDB
   * @param {Object} options Collection of properties to allow different types of logs to be added.
   * @example
      await sdk.logs.addLog({
        type: 'INFO',
        code: 'TEST',
        title: 'Information Log'
      })
   */
  async addLog (options) {
    if (this.logLevels.includes(options.type)) {
      const log = formatLog(options)
      await this.db.logs.put(log)
    } else {
      throw new TypeError(`Log type ${options.type} is unsupported. Please use one of ${this.logLevels}`)
    }
  }

  /**
   * Load a set of logs from indexedDB and stores it to provided store
   * @param {Object} options Collection of properties to allow different sets of logs to be grabbed. Supports pagination via offset & limit, and can collect logs of a given logLevel.
   * @example
   await sdk.logs.loadLogs({
      offset: 0,
      limit: 3,
      logLevel: 'ALL'
    })
   */
  async loadLogs (options) {
    // todo
    const {
      offset = 0,
      limit = 10,
      logLevel = 'ALL'
    } = options

    let payload = []
    const data = await this.db.logs.toArray()
    const wanted = this.logLevels.slice(0, this.logLevels.indexOf(logLevel) + 1)
    if (logLevel === 'ALL') {
      payload = data
    } else if (logLevel === 'OFF') {
      payload = []
    } else {
      for (const d of data) {
        wanted.forEach((type) => {
          if (d.message.includes(type)) payload.push(d)
        })
      }
    }

    if (limit < payload.length) payload = payload.splice(offset, limit)

    this.store.commit('app/logs', payload)
  }

  /**
   * Removes excess logs from indexedDB if limit is surpassed
   * @example
     await sdk.logs.applyPolicy()
   */
  async applyPolicy () {
    const data = await this.db.logs.toArray()
    if (data.length > this.limit) {
      const newData = takeRight(data, this.limit)
      await this.db.logs.clear()
      for (const log of newData) {
        await this.db.logs.put(log)
      }
    }
  }

  /**
   * Removes all logs from indexedDB & store
   * @example
    await sdk.logs.clearLogs()
   */
  async clearLogs () {
    await this.db.logs.clear()
    this.store.state.app.logs = []
  }
}

/**
 * Mangles data into a nicely shapen log message
 * @param {String} type The log type to store under.
 * @param {String} code The code of the log.
 * @param {String} title The title of the log.
 * @param {String} body The content of the log.
 * @example
 await sdk.logs.loadLogs({
      offset: 0,
      limit: 3,
      logLevel: 'ALL'
    })
 */
function formatLog ({ type, code, title, body }) {
  return {
    message: body ? `[${new Date()}] [${type}] ${code}: ${title}\n${body}` : `[${new Date()}] [${type}] ${code}: ${title}`,
    date: new Date()
  }
}
