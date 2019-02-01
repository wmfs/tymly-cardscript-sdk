const validator = require('@wmfs/cardscript-schema').validateForm
const quasarConverter = require('@wmfs/cardscript-to-quasar')
const extractDefaults = require('@wmfs/cardscript-extract-defaults')
const extractToc = require('@wmfs/cardscript-table-of-contents')
const extractLists = require('@wmfs/cardscript-extract-lists')
const sdk = require('@wmfs/cardscript-vue-sdk').default

module.exports = class Templates {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const { cards } = userQuery.add

    await this.db.templates.clear()

    for (const card of Object.values(cards)) {
      if (card.hasOwnProperty('type') && card.type === 'AdaptiveCard') {
        await this.db.templates.put({
          uiName: card.namespace + '_' + card.name,
          ...card,
          ...processCardscript(card)
        })
      }
    }
  }

  /**
   * Load templates from indexedDB to store
    @example
      await sdk.templates.load()
   */
  async load () {
    // todo: probably should change store to be object, so easier to access card via uiName
    const data = await this.db.templates.toArray()
    this.store.commit('app/templates', data)
  }

  /**
   * Unload templates from indexedDB
   * @example
   *  sdk.templates.unloadTemplates()
   */
  unloadTemplates () {
    // todo
    // this.db.templates = {}
  }
}

/**
 * Processes a cardscript object to prepare for rendering
 * @param {Object} card JSON object of Cardscript to be processed
 * @example
 *  sdk.templates.processCardscript(card)
 * @returns {Object} Processed cardscript JSON
 */
function processCardscript (card) {
  const r = {}

  const validatorOutput = validator(card)

  if (validatorOutput.elementsValid) {
    const defaultValues = extractDefaults(card)
    const defaultInternals = sdk.getDefaultInternals.default(card)
    defaultInternals.cardListDefaults = defaultValues.cardLists

    r.toc = extractToc(card)
    r.quasarTemplate = quasarConverter(card).template
    r.lists = extractLists(card)
    r.data = defaultValues.rootView
    r.internals = defaultInternals
    r.validations = {}
  } else {
    throw new Error(`${validatorOutput.errors[0].property} ${validatorOutput.errors[0].message}`)
  }

  return r
}
