module.exports = class Suggestions {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.executions = client.executions
    this.tokens = client.options.auth.token
  }

  /*
  * Function to generate summary info.
  * @example
  *   await sdk.summary.generateSummary()
  * */
  async generateSummary () {
    // TODO: Add in tasks
    let categories = await this.db.categories.toArray()

    const summary = {
      byCategory: []
    }

    for (const category of categories) {
      summary.byCategory.push({
        category: category.category,
        label: category.label
      })
    }

    console.log(summary)

    // categories = JSON.parse(JSON.stringify(categories))
    // console.log('++++++', categories)
    //
    // const startables = await this.db.startables.toArray()
    // const executions = await this.executions.getByLocalState()
    //
    // if (executions.DRAFTS.length > 0) {
    //   suggestions.push(
    //     {
    //       title: `Finish or cancel ${executions.DRAFTS.length} drafts`,
    //       type: 'redirect',
    //       to: 'DRAFTS'
    //     }
    //   )
    // }
    // if (executions.OUTBOX.length > 0) {
    //   suggestions.push(
    //     {
    //       title: `Retry sending ${executions.OUTBOX.length} forms`,
    //       type: 'redirect',
    //       to: 'OUTBOX'
    //     }
    //   )
    // }
    //
    // startables.forEach(startable => {
    //   if (suggestions.length < 4) {
    //     startable.type = 'startable'
    //     suggestions.push(startable)
    //   }
    // })

    this.store.commit('app/summary', summary)
  }
}
