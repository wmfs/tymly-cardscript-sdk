module.exports = class Info {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
  }

  /**
   * Function to set a single info value.
   * @param {string} id Id of value to set
   * @param value Related info to store.
   */
  async set (id, value) {
    await this.db.info.put({ id: id, value })
  }

  /**
   * Function to get a single info value.
   * @param {string} id Id of value to get
   * @return Info value.
   */
  async get (id) {
    const entry = await this.db.info.get(id)
    if (entry) {
      return entry.value
    }
  }

  /**
   * Function to get all info.
   * @return An array of id/value objects.
   */
  async getAll () {
    const allInfo = await this.db.info.toArray()
    return allInfo
  }

  /**
   * Function to delete one info.
   */
  async delete (id) {
    await this.db.info.delete(id)
  }

  /**
   * Function to clear/purge/delete all info.
   */
  async clear () {
    await this.db.info.clear()
  }
}
