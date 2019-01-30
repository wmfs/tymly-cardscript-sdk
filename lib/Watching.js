module.exports = class Watching {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.executions = client.executions
    this.token = client.options.auth.token
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const { watching } = userQuery

    await this.db.watching.clear()

    // todo: something with categories in indexedDB
    for (const category of Object.values(watching)) {
      for (const { subscriptions } of Object.values(category)) {
        for (const sub of subscriptions) {
          await this.db.watching.put(sub)
        }
      }
    }
  }

  /**
   * Load templates from indexedDB to store
    @example
      await sdk.templates.load()
   */
  async load () {
    const data = await this.db.watching.toArray()
    this.store.commit('app/watching', data)
  }

  /**
   * Watch a card
   * @param {Object} card The card to watch
    @example
      sdk.watching.watch(card)
   */
  watch (card) {
    return this.executions.execute({
      stateMachineName: 'tymly_watchBoard_1_0',
      input: card,
      token: this.token
    })
  }

  /**
   * Unwatch a card
   * @param {String} cardId The card to unwatch
    @example
      sdk.watching.unwatch(card)
   */
  unwatch (cardId) {
    return this.executions.execute({
      stateMachineName: 'tymly_unwatchBoard_1_0',
      input: cardId,
      token: this.token
    })
  }

  /**
   * Load watched cards
    @example
      await sdk.watching.loadWatching()
   */
  loadWatching () {
    // todo
    // this would be called from watching page

    // const { offset, limit, filter } = options
    // get from this.db
    // add result to vuex this.store
  }
}
