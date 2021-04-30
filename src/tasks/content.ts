import * as fs from 'fs'
import * as glob from 'glob'
import * as Handlebars from 'handlebars'
import * as path from 'path'
import {Converter} from 'showdown'
import * as yaml from 'js-yaml'
import {logger} from '../utilities/logger'
import {PROJECT_ROOT_PATH, CONTENT_DIRECTORY, FEATURES} from '../utilities/settings'
import {ApiData, CollectionData, SourceConfig, TemplateConfig} from '../utilities/interfaces'

const THEME_TEMPLATE_PATH = path.join(PROJECT_ROOT_PATH, 'themes')
const DEFAULT_THEME_TEMPLATE_PATH = path.join(THEME_TEMPLATE_PATH, 'default', 'default.html.hbs')
let OUTPUT_DIRECTORY = './dist'

function writeToFile(pathToFile: string, content: string): void {
  const parentDir = path.dirname(pathToFile)

  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, {recursive: true})
  }

  fs.writeFileSync(pathToFile, content)
}

function handlebarsHelperPhonetool(alias: string, name: string): string {
  let phonetool = ''

  if (process.env.PT_ENABLED && alias && typeof alias === 'string') {
    const templateFile = fs.readFileSync('./node_modules/mdcraft/templates/phonetool.html.hbs', 'utf-8').toString()
    const template = Handlebars.compile(templateFile)

    phonetool = template({
      alias: alias,
      name: name || alias,
      linkUrl: process.env.PT_LINK_URL!.replace(/&amp;/g, '&') || 'http://link.url/not-configured/',
      imageUrl: process.env.MDCRAFT_PT_IMAGE_URL!.replace(/&amp;/g, '&') || 'http://image.url/not-configured/',
    })
  }
  return phonetool
}

function postProcessContent(content: string): string {
  logger.debug('apply post processing to content')

  // you can't include this in npm. move to javascript?
  if (FEATURES.hasOwnProperty('phoneToolTemplate') && FEATURES.phoneToolTemplate) {
    if (content.indexOf('{{')) {
      const template = Handlebars.compile(content, {noEscape: true})

      Handlebars.registerHelper('phonetool', handlebarsHelperPhonetool)

      content = template({})
    }
  }

  return content
}

function getTemplateThemePath(themeName: string): string {
  let themePath = DEFAULT_THEME_TEMPLATE_PATH
  let templateFileName = `${themeName}.html.hbs`

  if (themeName.indexOf('/') !== -1) {
    const themeData = themeName.split('/')
    themeName = themeData[0]
    templateFileName = `${themeData[1]}.html.hbs`
  }
  const searching = true

  if (searching) {
    const globalThemePath = path.join(THEME_TEMPLATE_PATH, themeName, templateFileName)
    logger.debug(`searching for theme in ${globalThemePath}`)

    if (fs.existsSync(globalThemePath)) {
      themePath = globalThemePath
    }
  }

  logger.debug(`using template ${themePath}`)
  return themePath
}

function templateContent(data: TemplateConfig): string {
  logger.debug('templating content')
  logger.info(data)
  let generatedPage = data.content

  if (fs.existsSync(data.themePath)) {
    const templateFile = fs.readFileSync(data.themePath, 'utf-8').toString()
    const template = Handlebars.compile(templateFile)
    generatedPage = template(data)
  } else {
    logger.error(`unable to process template (${data.themePath}). no template found at path provided.`)
  }

  return generatedPage
}

function convertMarkdownToHtml(text: string): string {
  const converter = new Converter({'tables': true})
  return converter.makeHtml(text)
}

function wrapDocument(text: string, wrap: TemplateConfig): string {
  let wrapped = ''

  if (wrap) {
    // {"id":"barme", "class":"bar", "element":"main"}
    let wrapElement = 'div'
    let wrapId = ''
    let wrapClass = ''

    if (wrap['element']) {
      wrapElement = wrap['element'] as string
    }

    if (wrap['id']) {
      wrapId = ` id="${wrap['id']}" `
    }

    if (wrap['class']) {
      wrapClass = ` class="${wrap['class']}" `
    }

    wrapped = `<${wrapElement}${wrapId}${wrapClass}>${text}</${wrapElement}>`
  }

  return wrapped
}

function generateHtmlFromMarkdown(sourceData: SourceConfig): void {
  if (sourceData.target && sourceData.source && sourceData.content !== undefined) {
    logger.debug(`writing to ${sourceData.target} from ${sourceData.source}`)

    const templateLookup = {
      ...sourceData.data,
      content: sourceData.content,
      themePath: getTemplateThemePath(sourceData.data.theme as string),
    }
    let content = templateContent(templateLookup)
    content = postProcessContent(content)

    writeToFile(sourceData.target, content)
  } else {
    logger.error(`unable to generate target (${sourceData.target}). data missing in sourceData (content=${sourceData.content})`)
  }
}

function generateDefaultSourceConfig(sourcePath: string): SourceConfig {
  return {
    content: '',
    data: {
      format: 'md',
      theme: 'default',
    },
    source: sourcePath,
    target: path.join(OUTPUT_DIRECTORY, sourcePath).replace(/\.md$/, '.html'),
  }
}

function registerWithApiData(apiData: ApiData, metadata: SourceConfig): void {
  if (metadata['data']['index-title'] && metadata['data']['index-description']) {
    if (metadata['data']['index-include'] === undefined || metadata['data']['index-include'] === 'true')  {
      logger.debug(`including ${metadata.source} in document list`)
      const relativePath = `/${path.relative(OUTPUT_DIRECTORY, metadata.target)}`
      apiData.documents.push({
        title: metadata['data']['index-title'],
        description: metadata['data']['index-description'],
        path: relativePath,
        project: relativePath.split('/')[2],
      })
    } else {
      logger.debug(`excluding ${metadata.source} from document list`)
    }
  } else {
    logger.debug(`indexing metadata missing on ${metadata.source}, skipping`)
  }
}


function registerCollection(collections: CollectionData, metadata: SourceConfig): void {
  const collectionPath = path.dirname(metadata.source)

  if(!(collectionPath in collections)) {
    collections[collectionPath] = {
      data: {},
      content: '',
      source: '',
      target: '',
      resources: [],
    } as SourceConfig
  }

  collections[collectionPath]['content'] += metadata.content

  if (metadata.source.endsWith('index.md')) {
    // index likely won't be first so if set collection data to metadata then index data will be lost
    // could separate index from other content to stop duplication of logic
    collections[collectionPath]['data'] = metadata.data
    collections[collectionPath]['source'] = metadata.source
    collections[collectionPath]['target'] = OUTPUT_DIRECTORY + '/' + metadata.source.replace('md', 'html')
    collections[collectionPath]['data'] = {...metadata.data}
  } else {
    collections[collectionPath]['resources'].push(metadata.data)
  }
}

function parseSourceDocument(filePath: string): SourceConfig {
  const metadata: SourceConfig = generateDefaultSourceConfig(filePath)

  if (fs.existsSync(filePath)) {
    try {
      const pageDocuments = fs.readFileSync(filePath, 'utf8').toString().split(/---[\r\n|\r|\n]/) as string[]
      if (pageDocuments.length > 1) {
        logger.debug('there appears to be meta data. processing')
        const documentMetadata: TemplateConfig = yaml.safeLoad(pageDocuments[1]) as TemplateConfig
        metadata.data = {
          ...metadata.data,
          ...documentMetadata,
        }

        if (metadata.data.format !== 'html') {
          for (let i = 2; i < pageDocuments.length; i++) {
            if (pageDocuments[i].trim() === '') {
              continue
            }
            metadata.content += wrapDocument(convertMarkdownToHtml(pageDocuments[i]), {class: `md-page-${i - 2}`})
          }
        } else {
          // skip metadata and return document to previous state
          metadata.content = pageDocuments.slice(2).join('---')
        }
        if (documentMetadata.wrap && typeof documentMetadata.wrap !== 'string') {
          metadata.content = wrapDocument(metadata.content, documentMetadata.wrap)
        }
      } else {
        metadata.content = pageDocuments[0] // no metadata, just document
      }

      if (metadata.data.target) {
        metadata.target = path.join(OUTPUT_DIRECTORY, metadata.data.target as string)
      }

      // wrap and convert content now
    } catch (error) {
      logger.error(`unable to read metadata from ${filePath}\n${error.toString()}`)
    }
  }

  return metadata
}

export function generateSourceContent(config: any): void {
  OUTPUT_DIRECTORY = config.craft.output.destination

  if (FEATURES.hasOwnProperty('contentGeneration') && FEATURES.contentGeneration) {
    logger.info('generating source content')

    const apiData: ApiData = {
      documents: [] as TemplateConfig[],
    }
    const collections: CollectionData = {}

    for (const sourceRelPath of glob.sync(`./${CONTENT_DIRECTORY}/**/*.md`)) {
      logger.info(`processing ${sourceRelPath}`)

      const metadata: SourceConfig = parseSourceDocument(sourceRelPath)

      if (metadata.data.format === 'html') {
        writeToFile(metadata.target, metadata.content)
      } else if (metadata.data.format === 'collection') {
        registerCollection(collections, metadata)
      } else if (metadata.data.format === 'md') {
        generateHtmlFromMarkdown(metadata)
      } else {
        logger.error(`unknown data format in ${sourceRelPath}: ${metadata.data.format}`)
      }

      if (
        metadata.data.format !== 'collection'
        || (metadata.data.format === 'collection' && metadata.source.endsWith('index.md'))
      ) {
        registerWithApiData(apiData, metadata)
      }

      /* refactor start
      logger.info(`processing ${sourceRelPath}`)
      const sourceData: SourceConfig = parseMarkdown(sourceRelPath)
      const projectData: TemplateConfig = {
        title: sourceData['data']['index-title'],
        description: sourceData['data']['index-description'],
        path: sourceRelPath.replace('md', 'html'),
        project: sourceData.target.split('/')[2],
      }

      if (sourceData.data.format === 'html') {
        writeToFile(sourceData.target, sourceData.content)
      } else if (sourceData.data.format === 'collection') {
        // registerCollection
        const collectionPath = path.dirname(sourceRelPath)
        projectData['content'] = sourceData.content

        if(!(collectionPath in collections)) {
          collections[collectionPath] = {
            data: {},
            content: '',
            source: '',
            target: '',
            resources: [],
            projectData: projectData,
          } as SourceConfig
        }

        if (sourceRelPath.endsWith('index.md')) {
          registerContentWithApi(sourceData, projectData, apiData)
          // is there a reason I'm not using source data?
          collections[collectionPath]['data'] = projectData
          // this seems familiar
          collections[collectionPath]['source'] = sourceRelPath
          collections[collectionPath]['target'] = OUTPUT_DIRECTORY + '/' + sourceRelPath.replace('md', 'html')
          collections[collectionPath]['data'] = {...sourceData.data}
          // collections[collectionPath]['data']['theme'] = sourceData.data.theme
        } else {
          // should probably include more than just wrap
          if ('wrap' in sourceData.data) {
            logger.debug('including wrap details')
            projectData['wrap'] = sourceData.data.wrap
          }
          collections[collectionPath]['resources'].push(projectData)
        }
        // collections[collectionPath] = generateCollectionData()
      } else {
        // this call should be refactored
        sourceData.content = convertMarkdownToHtml(sourceData.content)
        generateHtmlFromMarkdown(sourceData)
        registerContentWithApi(sourceData, projectData, apiData)
      }
      // refactor end
      */
    }

    if (FEATURES.hasOwnProperty('collectionGeneration') && FEATURES.collectionGeneration) {
      logger.debug('----- generating collection content')
      for (const collectionRef in collections) {
        logger.info(`processing collection ${collectionRef}`)
        logger.debug(collections[collectionRef])
        generateHtmlFromMarkdown(collections[collectionRef])
        // registerContentWithApi(collections[collectionRef], collections[collectionRef]['projectData'], apiData)
      }
    }

    if (FEATURES.hasOwnProperty('apiGeneration') && FEATURES.apiGeneration) {
      logger.info('generating api data')
      const apiDataPath = OUTPUT_DIRECTORY + '/api/'
      const apiDataFile = path.join(apiDataPath, 'data.json')

      writeToFile(apiDataFile, JSON.stringify(apiData))
    }
  }
}
