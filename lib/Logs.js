const takeRight = require('lodash.takeright')

module.exports = class Logs {
  // Inspired by https://www.tutorialspoint.com/log4j/log4j_logging_levels.htm
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.limit = client.options.logLimit
    this.shim = client.options.globalVars.indexedDB

    // Ordered by level of log4j for reference
    this.logLevels = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
  }

  async addLog (options) {
    if (this.logLevels.includes(options.type)) {
      const log = formatLog(options)
      await this.db.logs.put(log)
    } else {
      throw new TypeError(`Log type ${options.type} is unsupported. Please use one of ${this.logLevels}`)
    }
  }

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

  async clearLogs () {
    await this.db.logs.clear()
    this.store.state.app.logs = []
  }
}

function formatLog ({type, code, title, body}) {
  return {
    message: body ? `[${new Date()}] [${type}] ${code}: ${title}\n${body}` : `[${new Date()}] [${type}] ${code}: ${title}`,
    date: new Date()
  }
}
