const takeRight = require('lodash.takeright')

module.exports = class Logs {
  // Inspired by https://www.tutorialspoint.com/log4j/log4j_logging_levels.htm
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.limit = client.options.logLimit
    this.shim = client.options.globalVars.indexedDB

    // Ordered by level of log4j for reference
    this.logLevels = ['OFF', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'ALL']
  }

  async addLog (options) {
    if (this.logLevels.includes(options.type)) {
      const log = formatLog(options)
      await this.db.logs.put(log)
      if ((await this.db.logs.toArray()).length > this.limit) {
        await this.applyPolicy()
      }
    } else {
      throw new TypeError(`Log type ${options.type} is unsupported. Please use one of ${this.logLevels}`)
    }
  }

  async loadLogs (options) {
    // todo
    // const { offset, limit, filter/logLevel } = options

    const data = await this.db.logs.toArray()
    this.store.commit('app/logs', data)
  }

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
}

function formatLog ({ type, code, title, body }) {
  return {
    message: body ? `[${type}] ${code}: ${title}\n${body}` : `[${type}] ${code}: ${title}`,
    date: new Date()
  }
}
