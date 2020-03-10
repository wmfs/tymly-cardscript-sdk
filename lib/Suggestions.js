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
    const startables = await this.db.startables.toArray()
    const executionSuggestions = await this.executionSuggestions()

    const suggestions = [...executionSuggestions]

    startables.forEach(startable => {
      if (suggestions.length < 4) {
        startable.type = 'startable'
        suggestions.push(startable)
      }
    })

    this.store.commit('app/suggestions', suggestions)
  }

  async executionSuggestions() {
    const suggestions = []
    const executions = await this.executions.getByLocalState()

    if (executions.DRAFTS.length > 0) {
      suggestions.push(
        {
          title: `Finish or cancel ${s('draft', executions.DRAFTS.length)}`,
          type: 'redirect',
          to: 'DRAFTS'
        }
      )
    }
    if (executions.OUTBOX.length > 0) {
      suggestions.push(
        {
          title: `Retry sending ${s('form', executions.OUTBOX.length)}`,
          type: 'redirect',
          to: 'OUTBOX'
        }
      )
    }
    return suggestions
  } // executionSuggestions
}

function s(word, order) {
  return `${order} ${word}${order > 1 ? 's' : ''}`
}
