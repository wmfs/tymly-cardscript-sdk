const axios = require('axios')

module.exports = class Auth0 {
  constructor (options) {
    this.options = options

    this.token = null
    this.accessToken = null
    this.expiresIn = null
    this.idToken = null
    this.tokenType = null
    this.scope = null
    this.name = null
    this.picture = null
    this.email = null
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

  /**
   * Persist from Auth0 callback values
   * @param {object} payload as provided by an Auth0 callback
   */
  async setFromCallbackPayload (payload) {
    // TODO: This can be tidier then?!
    console.log('Setting auth from payload')
    console.log(payload)
    this.token = payload.idToken // TODO: Deprecate this
    this.accessToken = payload.accessToken
    this.expiresIn = payload.expiresIn
    this.idToken = payload.idToken
    this.tokenType = payload.tokenType
    this.scope = payload.scope
    this.name = payload.idTokenPayload.name
    this.picture = payload.idTokenPayload.picture
    this.email = payload.idTokenPayload.email
    this.timestamp = new Date()
    await this.db.auth.clear()
    await this.db.auth.put({id: 'token', value: this.token})
    await this.db.auth.put({id: 'accessToken', value: this.accessToken})
    await this.db.auth.put({id: 'expiresIn', value: this.expiresIn})
    await this.db.auth.put({id: 'idToken', value: this.idToken})
    await this.db.auth.put({id: 'tokenType', value: this.tokenType})
    await this.db.auth.put({id: 'scope', value: this.scope})
    await this.db.auth.put({id: 'name', value: this.name})
    await this.db.auth.put({id: 'picture', value: this.picture})
    await this.db.auth.put({id: 'email', value: this.email})
    await this.db.auth.put({id: 'timestamp', value: this.timestamp})
  }

  /**
   * Clear tokens/profile info etc.
   */
  async clearStoredValues () {
    this.token = null
    this.accessToken = null
    this.expiresIn = null
    this.idToken = null
    this.tokenType = null
    this.scope = null
    this.name = null
    this.picture = null
    this.email = null
    this.timestamp = null
    await this.db.auth.clear()
  }

  /*
   * Set token and persist to back end, and local DB
   * @param {String} token The token to persist
   * @example
   * await this.setToken(data.access_token)
   */
  async setToken (token) {
    this.token = token
    this.timestamp = new Date()
    await this.persistToken()
    await this.loadToken()
  }

  // TODO: Bring-in that expiry time stuff?
  /*
  * Returns if token present
  * @example
  * */
  isAuthenticated () {
    return typeof this.token === 'string'
  }

  /*
  * Persist token to supplied db
  * @example
  * await this.persistToken()
  * */
  async persistToken () {
    await this.db.auth.clear()
    await this.db.auth.put({id: 'token', value: this.token})
    await this.db.auth.put({id: 'timestamp', value: this.timestamp})
    // TODO: Other things?
    // access_token
    // expires_in
    // id_token
    // scope
    // state
    // token_type
  }

  /*
  * Grab token from DB and persist into store
  * @example
  * await this.loadToken()
  * */
  async loadToken () {
    const {value} = await this.db.auth.get('token')
    this.store.commit('auth/token', value)
  }

  /*
  * Grab a token from the user request and persist using setToken function
  * @returns {String} token that was persisted
  * @example
  * await this.setTokenFromRequest()
  * */
  async setTokenFromRequest () {
    const {data} = await axios.request({
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
    if (this.options.tokenRefresh) {
      const {mode, seconds} = this.options.tokenRefresh

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
