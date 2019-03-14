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
    name: 'startables',
    singular: 'form',
    plural: 'forms'
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

  makeDirect (itemType, item) {
    const res = {}
    switch (itemType) {
      case 'startables':
        res.subtitle = `Start a '${item.title}' form.`
        res.start = {
          instigator: 'startable',
          stateMachineName: item.name,
          input: {},
          title: item.title
        }
        res.contents = {
          startables: [item]
        }
        break
      case 'todos':
        res.subtitle = `Complete '${item.todoTitle}' task.`
        const launch = item.launches[0]
        if (item.launches.length > 1) {
          res.subtitle += ` (${launch.title})`
        }
        res.subtitle += '.'
        res.start = {
          instigator: 'todo',
          stateMachineName: launch.stateMachineName,
          input: launch.input,
          title: launch.title
        }
        res.contents = {
          todos: [item]
        }
        break
      case 'watching':
        res.subtitle = `View '${item.title}' card.`
        res.start = {
          ...item.launches[0],
          instigator: 'watching'
        }
        res.contents = {
          watching: [item]
        }
        break
      case 'DRAFTS':
        // Not entirely sure this is possible, a draft with no startable?
        res.subtitle = `Finish draft.`
        break
      case 'OUTBOX':
        // Not entirely sure this is possible, a draft with no startable?
        res.subtitle = `Send outbox.`
        break
      default:
        // Not known?
        res.subtitle = `Unknown item '${itemType}'.`
    }
    return res
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
        category.related.startables.content.push(startable)
      } else {
        category.related.startables = {
          count: 1,
          first: startable,
          content: [startable]
        }
      }
    }

    const todos = await this.db.todo.toArray()
    for (const todo of todos) {
      const category = info[todo.stateMachineCategory]
      if (category.related.hasOwnProperty('todos')) {
        category.related.todos.count++
        category.related.todos.content.push(todo)
      } else {
        category.related.todos = {
          count: 1,
          first: todo,
          content: [todo]
        }
      }
    }

    const watching = await this.db.watching.toArray()
    for (const watch of watching) {
      if (watch.category) {
        const category = info[watch.category]
        if (category.related.watching) {
          category.related.watching.count++
          category.related.watching.content.push(watch)
        } else {
          category.related.watching = {
            count: 1,
            first: watch,
            content: [watch]
          }
        }
      }
    }

    const localStates = await this.executions.getByLocalState()

    Object.entries(localStates).forEach(([folderName, executions]) => {
      if (executions) {
        executions.forEach(execution => {
          if (execution.hasOwnProperty('stateMachine') && execution.stateMachine.category) {
            const category = info[execution.stateMachine.category]
            if (category.related.hasOwnProperty(folderName)) {
              category.related[folderName].count++
            } else {
              category.related[folderName] = {
                count: 1,
                first: execution
              }
            }
          }
        })
      }
    })

    // Process
    Object.entries(info).forEach(([categoryName, categoryInfo]) => {
      let itemCount = 0
      Object.entries(categoryInfo.related).forEach(([itemName, itemInfo]) => {
        itemCount += itemInfo.count
      })
      if (itemCount > 0) {
        console.log(categoryName, itemCount)
        console.log(categoryInfo)

        let tile
        const relatedKeys = Object.keys(categoryInfo.related)
        if (itemCount === 1) {
          // Just have 1 thing for this category.
          const directType = relatedKeys[0]
          tile = this.makeDirect(
            directType,
            categoryInfo.related[directType].first
          )
        } else {
          // Have multiple things...

          const parts = []
          const contents = {}
          SUMMARY_TYPES.forEach(summaryType => {
            if (categoryInfo.related.hasOwnProperty(summaryType.name)) {
              const { count, content } = categoryInfo.related[summaryType.name]
              const tag = count === 1 ? summaryType.singular : summaryType.plural
              parts.push(`${count} ${tag}`)

              if (content) contents[summaryType.name] = content
            }
          })
          tile = {
            subtitle: `Contains ${parts.join(',  ')}.`,
            contents
          }
        }

        summary.byCategory.push({
          category: categoryInfo.category,
          title: categoryInfo.title,
          subTitle: tile.subtitle,
          tileImage: `${categoryInfo.category}.jpg`,
          start: tile.start,
          contents: tile.contents || {}
        })
      }
    })

    console.log('======================')
    console.log(info)
    console.log('======================')
    console.log(summary)

    this.store.commit('app/summary', summary)
  }
}
