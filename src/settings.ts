import * as pino from 'pino'

interface FeaturesAvailability {
  [key: string]: boolean,
}

const logger = pino()

logger.updateLevel = function(): void {
  // this should be done better
  if (process.env.SILENT === 'true') {
    logger.level = 'error'
  } else if (process.env.DEBUG === 'true') {
    logger.level = 'debug'
  }
}

const PROJECT_ROOT_PATH = process.cwd()
const CONTENT_DIRECTORY = 'content'
const FEATURES: FeaturesAvailability = {
  apiGeneration: true,
  collectionGeneration: true,
  contentGeneration: true,
  phoneToolTemplate: true,
  themeGeneration: true,
}

export {PROJECT_ROOT_PATH, CONTENT_DIRECTORY, FEATURES, logger}
