module.exports = class Route {
  constructor (client) {
    this.destroy()
  }

  set (to) {
    if (to) {
      this.route = to
      console.log(`Capture route (name: ${this.route.name}`)
    } else {
      console.log('Ignored request to set route.')
      this.destroy()
    }
  }

  get () {
    console.log('Found captured route')
    return this.route
  }

  getAndDestroy () {
    const route = this.get()
    this.destroy()
    return route
  }

  destroy () {
    this.route = null
  }
}
