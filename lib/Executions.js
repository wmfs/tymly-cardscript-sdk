const axios = require('axios')

module.exports = class Executions {
  /**
   * Constructor for the Executions class
   * @param {object} client - Client passed from the SDK.
   */
  constructor (client) {
    this.db = client.db
    this.appName = client.options.appName
    this.store = client.options.appStore
    this.tymlyApiUrl = client.options.tymlyApiUrl
    this._getHash = client._getHash
    this.auth = client.auth
    this.limit = client.options.executionLimit || 100
  }

  async storeExecution (exec) {
    const existing = await this.db.executions.toArray()
    if (existing.length === this.limit) {
      const { executionName } = existing.sort((a, b) => new Date(a.localStateDate) - new Date(b.localStateDate))[0]
      await this.db.executions.delete(executionName)
    }
    // console.log('storeExecution:', exec)
    await this.db.executions.put(exec)
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
          Authorization: `Bearer ${this.auth.token}`
        }
      }
    )
  }

  async WaitUntilStoppedRunning (executionName) {
    const { data } = await axios.put(
      `${this.tymlyApiUrl}/${executionName}`,
      {
        action: 'WaitUntilStoppedRunning'
      },
      {
        headers: {
          Authorization: `Bearer ${this.auth.token}`
        }
      }
    )

    return data
  }

  async DescribeExecution (executionName, updateLastDescribed) {
    let url = `${this.tymlyApiUrl}/${executionName}`

    if (updateLastDescribed === true) {
      url += '?updateLastDescribed=true'
    }

    const { data } = await axios.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${this.auth.token}`
        }
      }
    )

    await this.storeFromServerRequest(data)

    return data
  }

  async StopExecution (executionName) {
    const { data } = await axios.delete(
      `${this.tymlyApiUrl}/${executionName}`,
      {
        headers: {
          Authorization: `Bearer ${this.auth.token}`
        }
      }
    )

    return data
  }

  /**
   * Sends POST request to server
   * @param {object} options - Options including the state machine name, input and sendResponse.
   * @return {object} Returns the result of the request.
   */
  async execute ({ stateMachineName, input, sendResponse, title }) {
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
          Authorization: `Bearer ${this.auth.token}`
        }
      }
    )

    try {
      if (!['NOAUTH', 'STATE_MACHINE_NOT_FOUND'].includes(data.status)) {
        await this.storeFromServerRequest({ ...data, executionTitle: title, executionInput: input })
      }
    } catch (err) {
      // todo: fix this!!
      console.log('Failed to store from server request')
    }

    return data
  }

  /**
   * Stores request to server in indexedDB
   * @param {object} execDesc - Execution description which was the result of the request.
   */
  async storeFromServerRequest (execDesc) {
    const { ctx, status, executionName, executionTitle, executionInput, stateMachineName } = execDesc
    const date = new Date()

    const stateMachine = { name: stateMachineName }

    const startableFromStore = this.store.getByStateMachineName(stateMachineName)

    if (startableFromStore) {
      stateMachine.category = startableFromStore.category
      stateMachine.title = startableFromStore.title
    }

    const res = {
      executionTitle,
      executionInput,
      status,
      executionName,
      stateMachine,
      locallyCreatedTimestamp: date,
      localState: 'DISPOSABLE',
      localStateDate: date
      // other things from ctx
    }

    let requiredHumanInput

    if (ctx) {
      if (ctx.requiredHumanInput) {
        requiredHumanInput = ctx.requiredHumanInput
      } else if (ctx.formData && ctx.formData.requiredHumanInput) {
        requiredHumanInput = ctx.formData.requiredHumanInput
      }
    }

    if (requiredHumanInput) {
      res.requiredHumanInput = requiredHumanInput

      if (requiredHumanInput.data) {
        res.originalDataHash = this._getHash(requiredHumanInput.data)
      }
    }

    await this.storeExecution(res)
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
    if (execution) {
      this.store.setExecution(execution)
    }
  }

  /**
   * Save data to execution and update to DRAFTS in IndexedDB
   * @param {object} config
   */
  async saveData (config) {
    const {
      executionName,
      data,
      localState,
      title,
      category
    } = config

    const execution = await this.db.executions.get(executionName)

    if (!execution) {
      console.log(`Can't save data because can't get execution '${executionName}'`)
      return
    }

    execution.localState = localState
    execution.localStateDate = new Date()
    execution.requiredHumanInput.data = data
    execution.subtitle = title
    execution.category = category

    await this.storeExecution(execution)
  }

  /**
   * Get the entries from IndexedDB by local states.
   */
  async getByLocalState () {
    const data = await this.db.executions.toArray()
    return {
      OUTBOX: data.filter(d => d.localState === 'OUTBOX'),
      DRAFTS: data.filter(d => d.localState === 'DRAFTS')
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
    const { execution } = this.store // or from db?

    if (Object.prototype.hasOwnProperty.call(execution, 'originalDataHash')) { // only if execution has requiredHumanInput.data
      return currentDataHash !== execution.originalDataHash
    } else {
      return true // or should it be false?
    }
  }
}
