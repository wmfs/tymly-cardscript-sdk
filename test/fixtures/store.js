const Vue = require('vue')

module.exports = {
  modules: {
    app: {
      namespaced: true,
      state: {
        startables: [],
        favourites: [],
        settings: [],
        watching: [],
        todos: [],
        logs: [],
        templates: [],
        execution: {},
        categories: []
      },
      getters: {
        getByStateMachineName (state) {
          return (stateMachineName) => {
            return state.startables.find(startable => startable.name === stateMachineName)
          }
        }
      },
      mutations: {
        execution: (state, execution) => { state.execution = execution },
        templates: (state, templates) => { state.templates = templates },
        logs: (state, logs) => { state.logs = logs },
        todos: (state, todos) => { state.todos = todos },
        watching: (state, watching) => { state.watching = watching },
        startables: (state, startables) => { state.startables = startables },
        startable: (state, startable) => Vue.set(state.startables, startable.name, startable),
        settings: (state, settings) => { state.settings = settings },
        favourites: (state, favourites) => { state.favourites = favourites },
        favourite: (state, startable) => {
          if (!state.favourites.includes(startable)) state.favourites.push(startable)
        },
        unfavourite: (state, startable) => {
          const index = state.favourites.indexOf(startable)
          if (index > -1) state.favourites.splice(index, 1)
        },
        categories: (state, categories) => { state.categories = categories }
      }
    },
    auth: {
      namespaced: true,
      state: {
        token: null
      },
      mutations: {
        token: (state, token) => { state.token = token }
      }
    }
  }
}
