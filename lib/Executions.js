const axios = require('axios')

module.exports = class Executions {
  /**
   * Constructor for the Executions class
   * @param {object} client - Client passed from the SDK.
   */
  constructor (client) {
    this.db = client.db
    this.appName = client.options.appName
    this.store = client.options.store
    this.tymlyApiUrl = client.options.tymlyApiUrl
    this._getHash = client._getHash
    this.token = client.options.auth.token
  }

  /**
   * Sends PUT request to server with action "SendTaskSuccess"
   * @param {object} options - Options including the execution name and output.
   * @return {object} Returns the result of the request.
   */
  async SendTaskSuccess ({ executionName, output }) {
    await axios.put(
      `${this.tymlyApiUrl}/${executionName}`,
      {
        action: 'SendTaskSuccess',
        output
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    )
  }

  /**
   * Sends POST request to server
   * @param {object} options - Options including the state machine name, input and sendResponse.
   * @return {object} Returns the result of the request.
   */
  async execute ({ stateMachineName, input, sendResponse }) {
    const { data } = await axios.post(
      this.tymlyApiUrl,
      {
        stateMachineName,
        input: input || {},
        options: {
          instigatingClient: {
            appName: this.appName,
            domain: ''
          },
          sendResponse: sendResponse || 'COMPLETE'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      }
    )

    await this.storeFromServerRequest(data)

    return data
  }

  /**
   * Stores request to server in indexedDB
   * @param {object} execDesc - Execution description which was the result of the request.
   */
  async storeFromServerRequest (execDesc) {
    console.log(execDesc)
    const { ctx, status, executionName } = execDesc
    const date = new Date()

    const res = {
      status,
      executionName,
      locallyCreatedTimestamp: date,
      localState: 'DISPOSABLE',
      localStateDate: date
      // other things from ctx
    }

    if (ctx.hasOwnProperty('requiredHumanInput')) {
      res.requiredHumanInput = ctx.requiredHumanInput

      if (ctx.requiredHumanInput.hasOwnProperty('data')) {
        res.originalDataHash = this._getHash(ctx.requiredHumanInput.data)
      }
    }

    await this.db.executions.put(res)
  }

  /**
   * Removes execution from indexedDB
   * @param {string} executionName - Name to identify the execution.
   */
  async remove (executionName) {
    await this.db.executions.delete(executionName)
  }

  /**
   * Checks if execution exists in indexedDB
   * @param {string} executionName - Name to identify the execution.
   * @return {boolean} Returns whether or not the execution exists in indexedDB.
   */
  async exists (executionName) {
    const data = await this.db.executions.get(executionName)
    return !!data
  }

  /**
   * Load an execution from indexedDB to the vuex store
   * @param {string} executionName - Name to identify the execution.
   */
  async load (executionName) {
    const execution = await this.db.executions.get(executionName)
    if (execution) this.store.commit('app/execution', execution)
  }

  /**
   * Save data to execution and update to IN_PROGRESS in IndexedDB
   * @param {string} executionName - Name to identify the execution.
   * @param {object} data - The data to save.
   */
  async saveData (executionName, data) {
    const execution = await this.db.executions.get(executionName)
    execution.localState = 'IN_PROGRESS'
    execution.localStateDate = new Date()
    execution.data = data
    await this.db.executions.put(execution)
  }

  /**
   * Get the entries from IndexedDB by local states.
   */
  async getByLocalState () {
    const data = await this.db.executions.toArray()
    return {
      OUTBOX: data.filter(d => d.localState === 'OUTBOX'),
      IN_PROGRESS: data.filter(d => d.localState === 'IN_PROGRESS')
    }
  }

  /**
   * Check if an execution has changed from what is stored.
   * @param {string} executionName - Name to identify the execution.
   * @param {object} data - The data to compare with.
   * @return {boolean} Returns whether or not the data has changed.
   */
  hasDataChanged (executionName, data) {
    // what about executionName?
    const currentDataHash = this._getHash(data)
    const { execution } = this.store.state.app // or from db?
    if (execution.hasOwnProperty('originalDataHash')) {
      return currentDataHash !== execution.originalDataHash
    }
  }
}
