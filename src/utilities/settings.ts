interface FeaturesAvailability {
  [key: string]: boolean,
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

export {PROJECT_ROOT_PATH, CONTENT_DIRECTORY, FEATURES}
