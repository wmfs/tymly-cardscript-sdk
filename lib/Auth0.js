module.exports = class Auth0 {
  constructor (options) {
    this.options = options
    this.triedToGetAToken = false
    this.token = null
    this.accessToken = null
    this.idToken = null
    this.tokenType = null
    this.scope = null
    this.name = null
    this.picture = null
    this.email = null
    this.sub = null
    this.exp = null
  }

  /**
   * Set up for Auth0 instance, assign db and store objects
   * @param {Client} client Instance of Tymly client
   */
  init (client) {
    this.client = client
    this.db = client.db
    this.store = client.options.store
  }

  /**
   * Persist from Auth0 callback values
   * @param {object} payload as provided by an Auth0 callback
   */
  async setFromCallbackPayload (payload) {
    // TODO: This can be tidier then?!
    this.triedToGetAToken = true
    this.token = payload.idToken // TODO: Deprecate this
    this.accessToken = payload.accessToken
    this.idToken = payload.idToken
    this.tokenType = payload.tokenType
    this.scope = payload.scope
    this.name = payload.idTokenPayload.name
    this.picture = payload.idTokenPayload.picture
    this.email = payload.idTokenPayload.email
    this.sub = payload.idTokenPayload.sub
    this.exp = payload.idTokenPayload.exp

    await this.db.auth.clear()
    await this.db.auth.put({ id: 'token', value: this.token })
    await this.db.auth.put({ id: 'accessToken', value: this.accessToken })
    await this.db.auth.put({ id: 'idToken', value: this.idToken })
    await this.db.auth.put({ id: 'tokenType', value: this.tokenType })
    await this.db.auth.put({ id: 'scope', value: this.scope })
    await this.db.auth.put({ id: 'name', value: this.name })
    await this.db.auth.put({ id: 'picture', value: this.picture })
    await this.db.auth.put({ id: 'email', value: this.email })
    await this.db.auth.put({ id: 'sub', value: this.sub })
    await this.db.auth.put({ id: 'exp', value: this.exp })
  }

  /**
   * Clear tokens/profile info etc.
   */
  async setFromStorage () {
    const _setIfStored = async (key) => {
      const obj = await this.db.auth.get(key)
      if (obj) {
        this[key] = obj.value
      }
    }

    this.triedToGetAToken = true
    const token = (await this.db.auth.get('token'))
    if (token && token.value) {
      console.log('FOUND TOKEN IN INDEXED DB')
      this.token = token.value
      await _setIfStored('accesstoken')
      await _setIfStored('expiresIn')
      await _setIfStored('idToken')
      await _setIfStored('tokenType')
      await _setIfStored('scope')
      await _setIfStored('name')
      await _setIfStored('picture')
      await _setIfStored('email')
      await _setIfStored('sub')
      await _setIfStored('exp')
      return true
    } else {
      return false
    }
  }

  /**
   * Clear tokens/profile info etc.
   */
  async clearStoredValues () {
    this.triedToGetAToken = false
    this.token = null
    this.accessToken = null
    this.idToken = null
    this.tokenType = null
    this.scope = null
    this.name = null
    this.picture = null
    this.email = null
    this.sub = null
    this.exp = null
    await this.db.auth.clear()
  }

  /**
   * Function to get all info.
   * @return An array of id/value objects.
   */
  getForDebug () {
    return [
      { id: 'name', value: this.name },
      { id: 'email', value: this.email },
      { id: 'sub', value: this.sub },
      { id: 'exp time', value: new Date(this.exp * 1000).toISOString() }
    ]
  }

  /**
   * Persist supplied token directly to db.
   * Use with caution, supplied here only to help facilitate testing with expired tokens.
   * Ordinarily use setFromCallbackPayload().
   * @example
   * await this.persistToken()
   */
  async invalidateToken () {
    const invalidTokenValue = 'I_AM_AN_INVALID_TOKEN_AND_MAY_BE_USEFUL_WHEN_TESTING'
    await this.db.auth.put({ id: 'token', value: invalidTokenValue })
    await this.db.auth.put({ id: 'idToken', value: invalidTokenValue })
  }

  // TODO: Bring-in that expiry time stuff?
  /**
   * Returns if token present
   * @example
   * */
  isAuthenticated () {
    return typeof this.token === 'string'
  }

  /**
   * Acknowledges a tour is finished by this user, and persists to backend DB
   * @example
   */
  async tourCompleted () {
    return this.client.executions.execute({
      stateMachineName: 'system_markTourComplete_1_0',
      input: {
        completed: true
      },
      token: this.token
    })
  }

  /**
   * Checks backend DB to see if user has completed tour
   * @example
   */
  async checkTour () {
    const completed = await this.db.auth.get('tourComplete') || { value: [] }
    if (completed && completed.value) {
      return { allowed: !completed.value.includes(this.sub), completed: completed.value }
    } else {
      return { allowed: false, completed: [] }
    }
  }
}
