module.exports = class Categories {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const startTime = Date.now()

    const categoriesToAdd = userQuery.add.categories || {}
    const categoriesToRemove = userQuery.remove.categories || []

    await Promise.all(categoriesToRemove.map(c => this.db.categories.delete(c)))

    await Promise.all(
      Object.values(categoriesToAdd).map(c => {
        c._modified = new Date()
        return this.db.categories.put(c)
      })
    )

    console.log(`Persisted categories in ${Date.now() - startTime}ms`)
  }

  /**
   * Load categories from indexedDB to store
   * @example await sdk.categories.load()
   */
  async load () {
    const categories = await this.db.categories.toArray()
    this.store.commit('app/categories', categories)
  }
}
