const { defineStore } = require('pinia')

module.exports = {
  useTrackerStore: defineStore('tracker', {
    state: () => ({
      executions: {}
    }),
    actions: {}
  })
}
