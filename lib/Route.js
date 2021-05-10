module.exports = class Route {
  constructor (client) {
    this.db = client.db
    // this.destroy()
  }

  async set (to) {
    await this.destroy()

    if (to) {
      const { path, query, params } = to
      await this.db.routes.put({ path, query, params })
      console.log(`Capture route (name: ${to.name})`)
    } else {
      console.log('Ignored request to set route.')
    }
  }

  async get () {
    console.log('Getting route')
    const data = await this.db.routes.toArray()
    if (data && data.length) return data[0]
  }

  getAndDestroy () {
    // const route = await this.get()
    // await this.destroy()
    // return route
    return this.get()
  }

  async destroy () {
    console.log('Destroying route')
    await this.db.routes.clear()
  }
}
