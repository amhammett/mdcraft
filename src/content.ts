import * as fs from 'fs'
import * as glob from 'glob'
import * as Handlebars from 'handlebars'
import * as path from 'path'
import {Converter} from 'showdown'
import * as yaml from 'js-yaml'
import {ApiData, CollectionData, TemplateConfig, SourceConfig} from './interfaces'
import {PROJECT_ROOT_PATH, CONTENT_DIRECTORY, FEATURES, logger} from './settings'

const THEME_TEMPLATE_PATH = path.join(PROJECT_ROOT_PATH, 'themes')
const DEFAULT_THEME_TEMPLATE_PATH = path.join(THEME_TEMPLATE_PATH, 'default', 'default.html.hbs')

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
    logger.error('unable to process template. no template found at path provided.')
  }

  return generatedPage
}

function convertMarkdownToHtml(text: string): string {
  const converter = new Converter()
  return converter.makeHtml(text)
}

function generateHtmlFromMarkdown(sourceData: SourceConfig): void {
  if (sourceData.target && sourceData.source && sourceData.content) {
    logger.debug(`writing to ${sourceData.target} from ${sourceData.source}`)

    const templateLookup = {
      ...sourceData.data,
      content: convertMarkdownToHtml(sourceData.content),
      themePath: getTemplateThemePath(sourceData.data.theme),
    }
    let content = templateContent(templateLookup)
    content = postProcessContent(content)

    writeToFile(sourceData.target, content)
  } else {
    logger.error('unable to generate target. data missing in sourceData')
  }
}

function parseMarkdown(pathToFile: string): SourceConfig {
  const documentWithoutMetaData = 0
  const liquidMetadataDocumentIndex = 1
  const markdownDocumentIndex = 2
  const sourceData: SourceConfig = {
    content: '',
    data: {
      format: 'md',
      theme: 'default',
    },
    source: pathToFile,
    target: path.join('./dist', pathToFile).replace(/.md$/, '.html'),
  }

  if (fs.existsSync(sourceData.source)) {
    try {
      const pageDocuments = fs.readFileSync(sourceData.source, 'utf8').toString().split(/---/)
      if (pageDocuments.length > 1) {
        logger.debug('there appears to be meta data. processing')
        sourceData.data = {
          ...sourceData.data,
          ...yaml.safeLoad(pageDocuments[liquidMetadataDocumentIndex]) as object,
        }
        sourceData.content = pageDocuments[markdownDocumentIndex]
      } else {
        sourceData.content = pageDocuments[documentWithoutMetaData]
      }

      if (sourceData.data.target) {
        sourceData.target = path.join('./dist', sourceData.data.target)
      }
    } catch (error) {
      logger.error(`unable to read front matter from ${pathToFile}\n${error.toString()}`)
    }
  }

  return sourceData
}

function registerContentWithApi(sourceData: SourceConfig, projectData: TemplateConfig, apiData: ApiData): void {
  if (projectData.path && projectData.title && projectData.project) {
    if ('index-include' in sourceData['data'] && !sourceData['data']['index-include']) {
      logger.info(`skipping ${projectData.path}`)
    } else {
      apiData.documents.push(projectData)
    }
  }
}

export function generateSourceContent(): void {
  logger.updateLevel('')

  if (FEATURES.hasOwnProperty('contentGeneration') && FEATURES.contentGeneration) {
    logger.info('generating source content')

    const apiData: ApiData = {
      documents: [] as TemplateConfig[],
    }
    const collections: CollectionData = {}

    for (const sourceRelPath of glob.sync(`./${CONTENT_DIRECTORY}/**/*.md`)) {
      logger.info(`processing ${sourceRelPath}`)
      const sourceData: SourceConfig = parseMarkdown(sourceRelPath)
      const projectData = {
        title: sourceData['data']['index-title'],
        description: sourceData['data']['index-description'],
        path: sourceRelPath.replace('md', 'html'),
        project: sourceData.target.split('/')[2],
      } as TemplateConfig

      if (sourceData.data.format === 'html') {
        writeToFile(sourceData.target, sourceData.content)
      } else if (sourceData.data.format === 'collection') {
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
          collections[collectionPath]['target'] = './dist/' + sourceRelPath.replace('md', 'html')
          collections[collectionPath]['data'] = {...sourceData.data}
          // collections[collectionPath]['data']['theme'] = sourceData.data.theme
        } else {
          collections[collectionPath]['resources'].push(projectData)
        }
        // collections[collectionPath] = generateCollectionData()
      } else {
        generateHtmlFromMarkdown(sourceData)
        registerContentWithApi(sourceData, projectData, apiData)
      }
    }

    if (FEATURES.hasOwnProperty('collectionGeneration') && FEATURES.collectionGeneration) {
      // logger.info('----- generating collection content')
      for (const collectionRef in collections) {
        logger.info(`processing collection ${collectionRef}`)
        for (const resource of collections[collectionRef]['resources']) {
          if (collections[collectionRef]['content']) {
            collections[collectionRef]['content'] += resource.content
          } else {
            collections[collectionRef]['content'] = resource.content
          }
        }
        delete collections[collectionRef]['resources']
        generateHtmlFromMarkdown(collections[collectionRef])
        registerContentWithApi(collections[collectionRef], collections[collectionRef]['projectData'], apiData)
      }
    }

    if (FEATURES.hasOwnProperty('apiGeneration') && FEATURES.apiGeneration) {
      logger.info('generating api data')
      const apiDataPath = './dist/api/'
      const apiDataFile = path.join(apiDataPath, 'data.json')

      writeToFile(apiDataFile, JSON.stringify(apiData))
    }
  }
}
