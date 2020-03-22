module.exports = class Suggestions {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.executions = client.executions
    this.tasks = client.tasks
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
    const taskSuggestions = await this.taskSuggestions()

    const suggestions = [
      ...executionSuggestions,
      ...taskSuggestions
    ]

    startables.forEach(startable => {
      if (suggestions.length < 4) {
        startable.type = 'startable'
        suggestions.push(startable)
      }
    })

    this.store.commit('app/suggestions', suggestions)
  }

  async executionSuggestions () {
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

  async taskSuggestions () {
    const suggestions = []
    const tasks = await this.tasks.getByLocalState()

    const rc = tasks.RUNNING.length
    const cc = tasks.COMPLETE.length

    if (rc || cc) {
      const r = s('running task', rc)
      const c = s('completed task', cc)

      suggestions.push(
        {
          title: `Return to ${r} ${(rc && cc) ? 'or' : ''} ${c}`,
          type: 'redirect',
          to: 'TASKS'
        }
      )
    }

    return suggestions
  }
}

function s (word, order) {
  if (order === 0) return ''
  return `${order} ${word}${order > 1 ? 's' : ''}`
}
