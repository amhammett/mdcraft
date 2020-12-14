import * as fs from 'fs'
import * as glob from 'glob'
import * as path from 'path'
import {logger} from '../utilities/logger'
import {FEATURES} from '../utilities/settings'

let OUTPUT_DIRECTORY = './dist'

function copyToDist(source: string, target: string): void {
  const targetDirectory = path.dirname(target)

  if (!fs.existsSync(targetDirectory)) {
    fs.mkdirSync(targetDirectory, {recursive: true})
  }

  fs.copyFileSync(source, target)
}

function copyThemeAssets(): void {
  logger.info(glob.sync('./{themes}/**/**.?(css|gif|jpg|png|map|svg)'))

  for (const sourceRelPath of glob.sync('./{themes,content}/**/**.?(css|js|gif|jpg|png|map|svg|ttf|woff|woff2)')) {
    logger.debug(sourceRelPath)

    if (fs.existsSync(sourceRelPath)) {
      logger.info(`copying ${sourceRelPath}`)
      copyToDist(sourceRelPath, path.join(OUTPUT_DIRECTORY, sourceRelPath))
    } else {
      logger.debug(`skipping copying ${sourceRelPath}`)
    }
  }
}

export function generateSiteThemes(config: any): void {
  // logger.updateLevel('')
  OUTPUT_DIRECTORY = config.craft.output.destination

  if (FEATURES.hasOwnProperty('themeGeneration') && FEATURES.themeGeneration) {
    logger.info('generating themes')
    copyThemeAssets()
  }
}
