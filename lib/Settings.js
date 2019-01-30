module.exports = class Settings {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.token = client.options.auth.token
    this.executions = client.executions
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const { settings } = userQuery
    await this.db.settings.put({ id: 'settings', settings })
  }

  /**
   * Load settings from indexedDB to store
    @example
      await sdk.settings.load()
   */
  async load () {
    const { settings } = await this.db.settings.get('settings')
    this.store.commit('app/settings', settings)
  }

  /**
   * apply newSettings object and commit to indexedDB and execute applySettings state machine
   * @param {Object} newSettings Object containing the changed settings preferences to be persisted
   * @example
      await sdk.settings.apply(newSettings)
   */
  async apply (newSettings) {
    this.store.commit('app/settings', newSettings)
    const { settings } = this.store.state.app
    await this.db.settings.put({ id: 'settings', settings })
    await this.executions.execute({
      stateMachineName: 'tymly_applySettings_1_0',
      input: {
        settings
      },
      token: this.token
    })
  }
}
