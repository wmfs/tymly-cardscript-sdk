module.exports = class Settings {
  constructor (client) {
    this.db = client.db
    this.store = client.options.appStore
    this.token = client.options.auth.token
    this.executions = client.executions
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const startTime = Date.now()

    const { settings } = userQuery
    await this.db.settings.put({ id: 'settings', settings })

    console.log(`Persisted settings in ${Date.now() - startTime}ms`)
  }

  /**
   * Load settings from indexedDB to store
    @example
      await sdk.settings.load()
   */
  async load () {
    const rows = await this.db.settings.get('settings')
    if (rows) {
      this.store.setSettings(rows.settings)
    }
  }

  /**
   * apply newSettings object and commit to indexedDB and execute applySettings state machine
   * @param {Object} newSettings Object containing the changed settings preferences to be persisted
   * @example
      await sdk.settings.apply(newSettings)
   */
  async apply (newSettings) {
    this.store.setSettings(newSettings)
    const { settings } = this.store
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
