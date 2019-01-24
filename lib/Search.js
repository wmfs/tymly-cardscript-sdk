module.exports = class Search {
  constructor (client) {
    this.store = client.options.store
    this.executions = client.executions
    this.token = client.options.auth.token
  }

  executeSearch (options) {
    return this.executions.execute({
      stateMachineName: 'tymly_search_1_0',
      input: options,
      token: this.token
    })
  }

  async search (options) {
    const result = await this.executeSearch(options)
    return result.ctx.searchResults
    // todo
    // save to recent searches to db and store
    // make sure to clear store - keep most recent 10
  }

  async getActiveEvents (options) {
    const result = await this.executeSearch({ ...options, showActiveEventsOnly: true })
    return result.ctx.searchResults
  }
}
