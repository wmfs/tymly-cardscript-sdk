const axios = require('axios')

module.exports = class Auth0 {
  constructor (options) {
    this.options = options
    this.token = null
    this.timestamp = null
  }

  /**
   * Set up for Auth0 instance, assign db and store objects
   * @param {Client} client Instance of Tymly client
   */
  init (client) {
    this.db = client.db
    this.store = client.options.store
  }

  /*
  * Persist token to supplied db
  * @example
  * await this.persistToken()
  * */
  async persistToken () {
    await this.db.auth.put({ id: 'token', token: this.token })
    await this.db.auth.put({ id: 'timestamp', token: this.timestamp })
  }

  /*
  * Grab token from DB and persist into store
  * @example
  * await this.loadToken()
  * */
  async loadToken () {
    const { token } = await this.db.auth.get('token')
    this.store.commit('auth/token', token)
  }

  /*
  * Set token and persist to back end, and local DB
  * @param {String} token The token to persist
  * @example
  * await this.setToken(data.access_token)
  * */
  async setToken (token) {
    this.token = token
    this.timestamp = new Date()

    await this.persistToken()
    await this.loadToken()
  }

  /*
  * Grab a token from the user request and persist using setToken function
  * @returns {String} token that was persisted
  * @example
  * await this.setTokenFromRequest()
  * */
  async setTokenFromRequest () {
    const { data } = await axios.request({
      method: 'post',
      url: `https://${this.options.domain}/oauth/token`,
      data: {
        grant_type: this.options.grant_type,
        client_id: this.options.client_id,
        client_secret: this.options.client_secret,
        audience: this.options.audience
      }
    })

    await this.setToken(data.access_token)
    return this.token
  }

  /*
  * Start a refresh timer after which, a new JWT will be requested. Can have mode 'ONCE' or 'REPEAT' to get one or many tokens.
  * @returns {Timeout} to be used for cancelRefreshTimer() function
  * @example
  * timer = await auth.startRefreshTimer()
  * */
  async startRefreshTimer () {
    const { mode, seconds } = this.options.tokenRefresh

    if (mode === 'ONCE') {
      return setTimeout(async () => {
        await this.setTokenFromRequest()
      }, seconds * 1000)
    } else if (mode === 'REPEAT') {
      return setInterval(async () => {
        await this.setTokenFromRequest()
      }, seconds * 1000)
    } else {
      throw new TypeError(`Token Refresh mode ${mode} not recognised. Please use one of 'ONCE' or 'REPEAT'`)
    }
  }

  /*
  * Cancel a refresh timer created by startRefreshTimer() function
  * @param {Timer} timer Timer object created by startRefreshTimer() function
  * @example
  * auth.cancelRefreshTimer(timer)
  * */
  cancelRefreshTimer (timer) {
    this.options.tokenRefresh.mode === 'ONCE' ? clearTimeout(timer) : clearInterval(timer)
  }
}
