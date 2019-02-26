const takeRight = require('lodash.takeright')

// Ordered by level of log4j for reference
const LOG_LEVELS = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']

module.exports = class Logs {
  /**
   * Constructor for Logs class, instantiated within the constructor for Tymly SDK. Inspired by https://www.tutorialspoint.com/log4j/log4j_logging_levels.htm
   * @param {object} client Instance of Tymly SDK to talk to
   * @example
   this.logs = new Logs(this)
   */
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.limit = client.options.logLimit
  }

  /**
   * Add a formatted log to indexedDB
   * @param {Object} options Collection of properties to allow different levels of logs to be added.
   * @example
   await sdk.logs.addLog({
        level: 'INFO',
        title: 'Information Log'
      })
   */
  async addLog (options) {
    if (LOG_LEVELS.includes(options.level)) {
      const log = formatLog(options)
      const logId = await this.db.logs.put(log)
      return logId
    } else {
      throw new TypeError(`Log level ${options.level} is unsupported. Please use one of ${LOG_LEVELS}.`)
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
  async loadLogs (options = {}) {
    const {
      // offset = 0,
      // limit = 10,
      logLevel = 'ALL'
    } = options

    const levelsWanted = LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(logLevel) + 1)
    const data = await this.db.logs.toArray()

    const payload = logLevel === 'ALL'
      ? data
      : data.filter(d => levelsWanted.includes(d.level))

    // if (limit < payload.length) payload = payload.splice(offset, limit)

    this.store.commit('app/logs', payload)
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
  async getLogEntry (suppliedLogId) {
    function _getFallbackLogEntry () {
      return {
        id: 0,
        title: 'Unknown log!',
        date: new Date(),
        level: 'ERROR',
        body: `Couldn't find log entry with id ${logId}`
      }
    }
    let logId
    try {
      logId = parseInt(suppliedLogId)
    } catch (e) {
      // Ignore
    }
    if (logId) {
      const logEntry = await this.db.logs.get(logId)
      if (logEntry) {
        return logEntry
      } else {
        return _getFallbackLogEntry()
      }
    } else {
      return _getFallbackLogEntry()
    }
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
 * Mangles data into a nicely formatted log message
 * @param {String} level The log level to store under.
 * @param {String} title The title of the log.
 * @param {String} body The content of the log.
 * @example
 await sdk.logs.loadLogs({
      offset: 0,
      limit: 3,
      logLevel: 'ALL'
    })
 */
function formatLog ({level, title, body = ''}) {
  return {
    title: `[${level}] ${title}`,
    body,
    date: new Date(),
    level
  }
}
