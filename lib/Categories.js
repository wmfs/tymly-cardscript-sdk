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
    const { categories } = userQuery.add
    await this.db.categories.clear()
    for (const c of Object.values(categories)) {
      await this.db.categories.put(c)
    }
  }
}
