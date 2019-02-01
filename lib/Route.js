module.exports = class Route {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
  }

  async set ({ path, query, params }) {
    await this.db.route.put({ id: 'route', path, query, params })
  }

  async get () {
    return this.db.route.get('route')
  }

  async getAndDestroy () {
    const res = await this.db.route.get('route')
    await this.db.route.clear()
    return res
  }

  async destroy () {
    await this.db.route.clear()
  }
}
