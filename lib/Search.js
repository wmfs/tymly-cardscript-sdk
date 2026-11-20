module.exports = class Search {
  constructor (client) {
    this.store = client.options.appStore
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
   * Record that the user opened a search result (search analytics).
   * Never throws, so a logging problem can't stop the user opening the result.
   * Needs @wmfs/tymly-solr-plugin with the tymly_logSearchClick_1_0 state machine.
   * @param {Object} click
   * searchLogId {string} returned with the search results
   * docId {string} docId of the result opened
   * docType {string} docType of the result opened (optional)
   * position {integer} position of the result across all pages, 1 is the first result
   * stateMachineName {string} the launch the user chose (optional)
   * @return {boolean} true if the click was logged
   */
  async recordClick ({ searchLogId, docId, docType, position, stateMachineName } = {}) {
    if (!searchLogId || !docId || !Number.isInteger(position)) return false

    const input = { searchLogId, docId, position }
    if (docType) input.docType = docType
    if (stateMachineName) input.stateMachineName = stateMachineName

    try {
      const result = await this.executions.execute({
        stateMachineName: 'tymly_logSearchClick_1_0',
        input,
        token: this.token
      })
      return result.status === 'SUCCEEDED'
    } catch (err) {
      return false
    }
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
