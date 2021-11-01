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

    const _modified = new Date()

    const categoriesToRemove = userQuery.remove.categories || []
    const categoriesToAdd = userQuery.add.categories
      ? Object.values(userQuery.add.categories).map(c => {
          c._modified = _modified
          return c
        })
      : []

    if (categoriesToRemove.length) await this.db.categories.bulkDelete(categoriesToRemove)
    if (categoriesToAdd.length) await this.db.categories.bulkPut(categoriesToAdd)

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
