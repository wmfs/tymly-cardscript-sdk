module.exports = class Watching {
  constructor (client) {
    this.db = client.db
    this.store = client.options.appStore
    this.executions = client.executions
    this.token = client.options.auth.token
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const startTime = Date.now()

    await this.db.watching.clear()

    const watching = []

    if (userQuery.watching) {
      for (const [categoryName, category] of Object.entries(userQuery.watching)) {
        for (const { subscriptions } of Object.values(category)) {
          for (const sub of subscriptions) {
            watching.push({ ...sub, category: categoryName })
          }
        }
      }
    }

    if (watching.length) await this.db.watching.bulkPut(watching)

    // for (const [categoryName, category] of Object.entries(watching)) {
    //   for (const { subscriptions } of Object.values(category)) {
    //     for (const sub of subscriptions) {
    //       await this.db.watching.put({
    //         ...sub,
    //         category: categoryName
    //       })
    //     }
    //   }
    // }

    console.log(`Persisted watching in ${Date.now() - startTime}ms`)
  }

  /**
   * Load templates from indexedDB to store
   @example
   await sdk.templates.load()
   */
  async load () {
    // TODO: What if there are lots? Should be paginated/by id?
    const data = await this.db.watching.toArray()
    this.store.setWatching(data)
  }

  /**
   * Watch a card
   * @param {Object} input The details of the card to watch
   @example
   sdk.watching.watch(card)
   */
  watch (input) {
    return this.executions.execute({
      stateMachineName: 'tymly_watchBoard_1_0',
      input,
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
      input: { subscriptionId: cardId },
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
