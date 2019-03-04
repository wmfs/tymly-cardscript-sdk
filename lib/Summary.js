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
    const categories = await this.db.categories.toArray()

    const info = {}
    const summary = {
      byCategory: []
    }

    for (const category of categories) {
      info[category.category] = {
        category: category.category,
        title: category.label,
        related: {}
      }
    }

    const startables = await this.db.startables.toArray()
    for (const startable of startables) {
      const category = info[startable.category]
      if (category.related.hasOwnProperty('startables')) {
        category.related.startables.count++
      } else {
        category.related.startables = {
          count: 1,
          first: startable
        }
      }
    }

    const todos = await this.db.todo.toArray()
    for (const todo of todos) {
      const category = info[todo.stateMachineCategory]
      if (category.related.hasOwnProperty('todos')) {
        category.related.todos.count++
      } else {
        category.related.todos = {
          count: 1,
          first: todo
        }
      }
    }

    // const todos = await this.db.todo.toArray()

    // for (const category of categories) {
    //   info[category.category] = {
    //     category: category.category,
    //     title: category.label,
    //     related: {}
    //   }
    // }

    console.log('======================')
    console.log(info)
    console.log('======================')
    console.log(summary)

    // summary.byCategory.push({
    //   category: category.category,
    //   title: category.label,
    //   subTitle: 'Hello'
    // })

    // console.log(summary)

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
