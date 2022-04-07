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

module.exports = class Suggestions {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
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

    for (const category of categories) {
      if (category.category !== 'covid19') {
        info[category.category] = {
          category: category.category,
          title: category.label,
          related: {}
        }
      }
    }

    const startables = await this.db.startables.toArray()
    for (const startable of startables) {
      const category = info[startable.category]

      if (!category) {
        continue
      }

      if (startable.instigatorGroup === 'app') {
        if (category.related.apps) {
          category.related.apps.count++
          category.related.apps.content.push(startable)
        } else {
          category.related.apps = {
            count: 1,
            content: [startable]
          }
        }
      } else {
        if (category.related.forms) {
          category.related.forms.count++
          category.related.forms.content.push(startable)
        } else {
          category.related.forms = {
            count: 1,
            content: [startable]
          }
        }
      }
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
      if (watch.category) {
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
    }

    const localStates = await this.executions.getByLocalState()

    Object.entries(localStates).forEach(([folderName, executions]) => {
      if (executions) {
        executions.forEach(execution => {
          if (execution.stateMachine && execution.stateMachine.category) {
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
        })
      }
    })

    Object.entries(info).forEach(([categoryName, categoryInfo]) => {
      let itemCount = 0
      Object.entries(categoryInfo.related).forEach(([itemName, itemInfo]) => {
        itemCount += itemInfo.count
      })
      if (itemCount > 0) {
        const parts = []
        const contents = {}
        const offlineContents = {}
        SUMMARY_TYPES.forEach(summaryType => {
          if (categoryInfo.related[summaryType.name]) {
            const { count, content } = categoryInfo.related[summaryType.name]
            const tag = count === 1 ? summaryType.singular : summaryType.plural
            parts.push(`${count} ${tag}`)

            if (content) contents[summaryType.name] = content

            content.forEach(item => {
              if (item.canBeStartedOffline === true) {
                offlineContents[summaryType.name] = content
              }
            })
          }
        })

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
    })

    console.log('INFO:', info)
    console.log('SUMMARY:', summary)

    this.store.commit('app/summary', summary)
  }
}
