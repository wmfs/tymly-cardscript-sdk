const Dexie = require('dexie').default

/**
 * Sets up the indexedDB database
 * @param {object} options - Options for the database.
 * @returns {object} Returns the database client.
 */
module.exports = options => {
  const { indexedDB, IDBKeyRange } = options

  const db = new Dexie('TymlyDatabase', { indexedDB, IDBKeyRange })

  db.version(1).stores({
    startables: '&name, title, description, category, instigators',
    todo: '&id, todoTitle, description',
    logs: '++, title, body, date, level',
    watching: '&subscriptionId, title, description',
    auth: '&id, value',
    favourites: '&id, favourites',
    settings: '&id, settings',
    info: '&id',
    templates: '&uiName, template, data, lists, internals',
    executions: '&executionName, localState',
    search: '++, query, result',
    route: '&id, path, query, params'
  }).upgrade(tx => {})

  db.version(2).stores({
    startables: '&name, title, description, category, instigators',
    todo: '&id, todoTitle, description',
    logs: '++, title, body, date, level',
    watching: '&subscriptionId, title, description',
    auth: '&id, value',
    favourites: '&id, favourites',
    settings: '&id, settings',
    info: '&id',
    templates: '&uiName, template, data, lists, internals',
    executions: '&executionName, localState',
    search: '++, query, result',
    route: '&id, path, query, params'
  }).upgrade(tx => {})

  db.version(3).stores({
    startables: '&name, title, description, category, instigators',
    categories: '&category',
    todo: '&id, todoTitle, description',
    logs: '++, title, body, date, level',
    watching: '&subscriptionId, title, description',
    auth: '&id, value',
    favourites: '&id, favourites',
    settings: '&id, settings',
    info: '&id',
    templates: '&uiName, template, data, lists, internals',
    executions: '&executionName, localState',
    search: '++, query, result',
    route: '&id, path, query, params'
  }).upgrade(tx => {})

  db.version(4).stores({
    startables: '&name, title, description, category, instigators',
    categories: '&category',
    todo: '&id, todoTitle, description',
    logs: '++, title, body, date, level',
    watching: '&subscriptionId, title, description',
    auth: '&id, value',
    favourites: '&id, favourites',
    settings: '&id, settings',
    info: '&id',
    templates: '&uiName, template, data, lists, internals',
    executions: '&executionName, localState',
    search: '++, query, result',
    route: '&id, path, query, params',
    tasksRunning: '&executionName, stateMachineName, startDate',
    tasksComplete: '&executionName, stateMachineName, startDate'
  }).upgrade(tx => {})

  return db
}
