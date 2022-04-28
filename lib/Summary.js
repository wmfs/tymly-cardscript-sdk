const SUMMARY_TYPES = [
  {
    name: 'DRAFTS',
    singular: 'draft',
    plural: 'drafts'
  },
  {
    name: 'todos',
    singular: 'task',
    plural: 'tasks'
  },
  {
    name: 'forms',
    singular: 'form',
    plural: 'forms'
  },
  {
    name: 'apps',
    singular: 'app',
    plural: 'apps'
  },
  {
    name: 'watching',
    singular: 'watched card',
    plural: 'watched cards'
  }
]

module.exports = class Summary {
  constructor (client) {
    this.db = client.db
    this.store = client.options.appStore
    this.executions = client.executions
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
    // const stateMachines = new Set()

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

      if (!category) {
        continue
      }

      // stateMachines.add(startable.name)

      const group = startable.instigatorGroup === 'app'
        ? 'apps'
        : 'forms'

      if (!category.related[group]) {
        category.related[group] = {
          count: 0,
          content: []
        }
      }

      category.related[group].count++
      category.related[group].content.push(startable)
    }

    const todos = await this.db.todo.toArray()
    for (const todo of todos) {
      const category = info[todo.stateMachineCategory]

      if (!category) {
        continue
      }

      if (Object.prototype.hasOwnProperty.call(category.related, 'todos')) {
        category.related.todos.count++
        category.related.todos.content.push(todo)
      } else {
        category.related.todos = {
          count: 1,
          content: [todo]
        }
      }
    }

    const watching = await this.db.watching.toArray()
    for (const watch of watching) {
      if (!watch.category) {
        continue
      }

      const category = info[watch.category]

      if (!category) {
        continue
      }

      if (category.related.watching) {
        category.related.watching.count++
        category.related.watching.content.push(watch)
      } else {
        category.related.watching = {
          count: 1,
          content: [watch]
        }
      }
    }

    const localStates = await this.executions.getByLocalState()

    for (const [folderName, executions] of Object.entries(localStates)) {
      if (!executions) {
        continue
      }

      for (const execution of executions) {
        if (!execution.stateMachine) {
          continue
        }

        if (!execution.stateMachine.category) {
          continue
        }

        // if (!stateMachines.has(execution.stateMachine.name)) {
        //   continue
        // }

        const category = info[execution.stateMachine.category]

        if (!category) {
          return
        }

        if (category.related[folderName]) {
          category.related[folderName].count++
        } else {
          category.related[folderName] = {
            count: 1,
            content: [execution]
          }
        }
      }
    }

    for (const categoryInfo of Object.values(info)) {
      let itemCount = 0

      for (const itemInfo of Object.values(categoryInfo.related)) {
        itemCount += itemInfo.count
      }

      if (itemCount > 0) {
        const parts = []
        const contents = {}
        const offlineContents = {}

        for (const summaryType of SUMMARY_TYPES) {
          if (!categoryInfo.related[summaryType.name]) {
            continue
          }

          const { count, content } = categoryInfo.related[summaryType.name]
          const tag = count === 1 ? summaryType.singular : summaryType.plural
          parts.push(`${count} ${tag}`)

          if (content) {
            contents[summaryType.name] = content
          }

          for (const item of content) {
            if (item.canBeStartedOffline === true) {
              offlineContents[summaryType.name] = content
            }
          }
        }

        summary.byCategory.push({
          category: categoryInfo.category,
          title: categoryInfo.title,
          subTitle: `Contains ${parts.join(',  ')}.`,
          tileImage: `${categoryInfo.category}.jpg`,
          contents,
          offlineContents,
          itemCount
        })
      }
    }

    console.log('INFO:', info)
    console.log('SUMMARY:', summary)

    this.store.setSummary(summary)
  }
}
