const { defineStore } = require('pinia')

module.exports = {
  useAppStore: defineStore('app', {
    state: () => ({
      cardDebug: false,
      startables: [],
      favourites: [],
      settings: {
        categoryRelevance: []
      },
      watching: [],
      todos: [],
      categories: [],
      logs: [],
      templates: [],
      suggestions: [],
      tasks: {},
      summary: {
        byCategory: []
      },
      execution: {},
      executionHistory: {},
      executionGoBack: false,
      template: {},
      title: '',
      online: true,
      offlineMode: 'AUTO',
      sdk: null,
      invalidFields: {},
      draftsCount: 0,
      outboxCount: 0,
      tasksCount: 0,
      mapFlyTo: {}
    }),
    getters: {
      getByStateMachineName: state => {
        return stateMachineName => {
          return state.startables.find(startable => startable.name === stateMachineName)
        }
      }
    },
    actions: {
      setStartables (payload) {
        this.startables = payload
      },
      setTodos (payload) {
        this.todos = payload
      },
      setWatching (payload) {
        this.watching = payload
      },
      setSettings (payload) {
        this.settings = payload
      },
      setCategories (payload) {
        this.categories = payload
      },
      setOnline (payload) {
        this.online = payload
      },
      setOfflineMode (payload) {
        this.offlineMode = payload
      },
      setCardDebug (payload) {
        this.cardDebug = payload
      },
      setTitle (payload) {
        this.title = payload
      },
      setExecution (payload) {
        this.execution = payload
      },
      setExecutionHistory (payload) {
        this.executionHistory = payload
      },
      setExecutionGoBack (payload) {
        this.executionGoBack = payload
      },
      setTemplate (payload) {
        this.template = payload
      },
      setTemplates (payload) {
        this.templates = payload
      },
      setTasks (payload) {
        this.tasks = payload
      },
      setInvalidFields (payload) {
        this.invalidFields = payload
      },
      setDraftsCount (payload) {
        this.draftsCount = payload
      },
      setOutboxCount (payload) {
        this.outboxCount = payload
      },
      setTasksCount (payload) {
        this.tasksCount = payload
      },
      setLogs (payload) {
        this.logs = payload
      },
      setSuggestions (payload) {
        this.suggestions = payload
      },
      setFavourites (payload) {
        this.favourites = payload
      },
      setSummary (payload) {
        this.summary = payload
      },
      favourite (payload) {
        if (!this.favourites.includes(payload)) {
          this.favourites.push(payload)
        }
      },
      unfavourite (payload) {
        const index = this.favourites.indexOf(payload)
        if (index > -1) {
          this.favourites.splice(index, 1)
        }
      },
      removeFromSummary (payload) {
        const { category, id, type } = payload

        const contentKey = {
          draft: 'DRAFTS',
          watch: 'watching',
          todo: 'todos'
        }[type]

        const recordKey = {
          draft: 'executionName',
          watch: 'subscriptionId',
          todo: 'id'
        }[type]

        const categoryIdx = this.summary.byCategory.findIndex(c => c.category === category)
        if (categoryIdx === -1) {
          return
        }

        const recordIdx = this.summary.byCategory[categoryIdx].contents[contentKey].findIndex(c => c[recordKey] === id)
        if (recordIdx === -1) {
          return
        }

        const copy = JSON.parse(JSON.stringify(this.summary.byCategory[categoryIdx].contents[contentKey]))
        copy.splice(recordIdx, 1)

        this.summary.byCategory[categoryIdx].contents[contentKey] = copy
      },
      doMapFlyTo (payload) {
        const { id, lat, lng, complete } = payload
        this.mapFlyTo[id] = { lat, lng, complete }
      }
    }
  })
}
