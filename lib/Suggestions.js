module.exports = class Suggestions {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.executions = client.executions
    this.tokens = client.options.auth.token
  }

  /*
  * Function to generate an array of suggestions based on drafts, outbox, and startables
  * @example
  *   await sdk.suggestions.generateSuggestions()
  * */
  async generateSuggestions () {
    const suggestions = []

    const startables = await this.db.startables.toArray()
    const executions = await this.executions.getByLocalState()

    if (executions.DRAFTS.length > 0) {
      suggestions.push(
        {
          title: `Finish or cancel ${executions.DRAFTS.length} drafts`,
          type: 'redirect',
          to: 'DRAFTS'
        }
      )
    }
    if (executions.OUTBOX.length > 0) {
      suggestions.push(
        {
          title: `Retry sending ${executions.OUTBOX.length} forms`,
          type: 'redirect',
          to: 'OUTBOX'
        }
      )
    }

    startables.forEach(startable => {
      if (suggestions.length < 4) {
        startable.type = 'startable'
        suggestions.push(startable)
      }
    })

    this.store.commit('app/suggestions', suggestions)
  }
}
