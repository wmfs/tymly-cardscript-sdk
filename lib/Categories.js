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
    const categoriesToAdd = userQuery.add.categories || {}
    const categoriesToRemove = userQuery.remove.categories || []

    for (const c of Object.values(categoriesToAdd)) {
      c._modified = new Date()
      await this.db.categories.put(c)
    }

    for (const c of categoriesToRemove) {
      await this.db.categories.delete(c)
    }
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
