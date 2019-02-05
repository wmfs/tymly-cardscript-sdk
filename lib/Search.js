module.exports = class Search {
  constructor (client) {
    this.store = client.options.store
    this.executions = client.executions
    this.token = client.options.auth.token
  }

  /**
   * Execute tymly_search state machine (to be used as part of search function)
   * @param {Object} options Options object describing the input of the Tymly search
   * Can include the below:
   * query {string}
   * domain {string}
   * orderBy {string}
   * offset {integer}
   * limit {integer}
   * lat {number}
   * long {number}
   * categoryRestriction {array}
   */

  executeSearch (options) {
    return this.executions.execute({
      stateMachineName: 'tymly_search_1_0',
      input: options,
      token: this.token
    })
  }

  /**
   * Execute tymly_search state machine (to be used as part of search function)
   * @param {Object} options Options object describing the input of the Tymly search
   * Can include the below:
   * query {string}
   * domain {string}
   * orderBy {string}
   * offset {integer}
   * limit {integer}
   * lat {number}
   * long {number}
   * categoryRestriction {array}
   */
  async search (options) {
    options = this.parseOptions(options)
    const result = await this.executeSearch(options)
    return result.ctx.searchResults
    // todo
    // save to recent searches to db and store
    // make sure to clear store - keep most recent 10
  }

  /**
   * Check the options are valid
   * @param {Object} options Options object describing the input of the Tymly search
   * Can include the below:
   * query {string}
   * domain {string}
   * orderBy {string}
   * offset {integer}
   * limit {integer}
   * lat {number}
   * long {number}
   * categoryRestriction {array}
   */
  parseOptions (options) {
    if (options.limit && !Number.isInteger(options.limit)) options.limit = 10
    if (options.offset && !Number.isInteger(options.offset)) options.offset = 0
    return options
  }

  /**
   * Execute tymly_search state machine for active-events only
   * @param {Object} options Options object describing the input of the Tymly search
   * Can include the below:
   * query {string}
   * domain {string}
   * orderBy {string}
   * offset {integer}
   * limit {integer}
   * lat {number}
   * long {number}
   * categoryRestriction {array}
   */
  async getActiveEvents (options) {
    const result = await this.executeSearch({ ...options, showActiveEventsOnly: true })
    return result.ctx.searchResults
  }
}
