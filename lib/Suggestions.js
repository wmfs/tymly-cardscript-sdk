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

    suggestions.push(
      {
        title: `Finish or cancel ${executions.DRAFTS.length} drafts`
      }
    )
    suggestions.push(
      {
        title: `Retry sending ${executions.OUTBOX.length} forms`
      }
    )

    startables.forEach(startable => {
      if (suggestions.length < 5) {
        suggestions.push(startable)
      }
    })

    this.store.commit('app/suggestions', suggestions)
  }
}
