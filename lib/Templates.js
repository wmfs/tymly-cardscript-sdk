const validator = require('@wmfs/cardscript-schema').validateForm
const quasarConverter = require('@wmfs/cardscript-to-quasar')
const extractDefaults = require('@wmfs/cardscript-extract-defaults')
const extractToc = require('@wmfs/cardscript-table-of-contents')
const extractLists = require('@wmfs/cardscript-extract-lists')
const extractGraphs = require('@wmfs/cardscript-extract-graphs')
const sdk = require('@wmfs/cardscript-vue-sdk')

module.exports = class Templates {
  constructor (client) {
    this.imageSourceTemplate = client.options.imagesBaseUrl + '/${imagePath}' // eslint-disable-line
    this.db = client.db
    this.store = client.options.store
  }

  async load (id) {
    if (id) {
      console.log('Loading template:', id)
      const template = await this.db.templates.get(id)
      const rawTemplate = {
        uiName: id,
        ...template,
        ...await this.processCardscript(template)
      }

      if (rawTemplate) {
        this.store.commit('app/template', JSON.parse(JSON.stringify(rawTemplate)))
        return true
      } else {
        return false
      }
    } else {
      const templates = await this.db.templates.toArray()
      this.store.commit('app/templates', templates)
    }
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const startTime = Date.now()

    const cardsToAdd = userQuery.add.cards || {}
    const cardsToRemove = userQuery.remove.cards || []

    const _modified = new Date()

    await this.db.templates.bulkDelete(
      cardsToRemove
        .map(card => this.store.state.app.templates.find(t => `${t.namespace}_${t.name}_${t.version.replace(/\./g, '_')}` === card))
        .filter(template => template)
        .map(template => template.uiName)
    )

    await this.db.templates.bulkPut(
      Object
        .values(cardsToAdd)
        .filter(card => card.type && card.type === 'AdaptiveCard')
        .map(card => {
          const uiName = `${card.namespace}_${card.name}`
          return { uiName, ...card, _modified }
        })
    )

    console.log(`Persisted templates in ${Date.now() - startTime}ms`)
  }

  // /**
  //  * Load templates from indexedDB to store
  //  @example
  //  await sdk.templates.load()
  //  */
  // async load () {
  //   // todo: probably should change store to be object, so easier to access card via uiName
  //   const data = await this.db.templates.toArray()
  //   this.store.commit('app/templates', data)
  // }

  /**
   * Unload templates from indexedDB
   * @example
   *  sdk.templates.unloadTemplates()
   */
  unloadTemplates () {
    // todo
    // this.db.templates = {}
  }

  /**
   * Processes a cardscript object to prepare for rendering
   * @param {Object} card JSON object of Cardscript to be processed
   * @example
   *  sdk.templates.processCardscript(card)
   * @returns {Object} Processed cardscript JSON
   */
  async processCardscript (card) {
    const r = {}

    const validatorOutput = validator(card)

    if (validatorOutput.elementsValid) {
      const defaultValues = await extractDefaults(card)
      const defaultInternals = sdk.getDefaultInternals(card)
      defaultInternals.cardListDefaults = defaultValues.cardLists
      r.toc = extractToc(card)
      r.quasarTemplate = quasarConverter(
        card,
        {
          imageSourceTemplate: `url(${this.imageSourceTemplate})`
        }
      ).template
      r.lists = extractLists(card)
      r.graphs = extractGraphs(card)
      r.data = defaultValues.rootView
      r.internals = defaultInternals
    } else {
      throw new Error(`${validatorOutput.errors[0].property} ${validatorOutput.errors[0].message}`)
    }

    return r
  }
}
