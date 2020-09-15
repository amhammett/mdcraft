import * as fs from 'fs'
import * as glob from 'glob'
import * as path from 'path'
import {logger, FEATURES} from './settings'

function copyToDist(source: string, target: string): void {
  const targetDirectory = path.dirname(target)

  if (!fs.existsSync(targetDirectory)) {
    fs.mkdirSync(targetDirectory, {recursive: true})
  }

  fs.copyFileSync(source, target)
}

function copyThemeAssets(): void {
  for (const sourceRelPath of glob.sync('./{themes,content}/**/**.?(css|gif|jpg|png|map|svg|ttf|woff|woff2')) {
    logger.debug(sourceRelPath)

    if (fs.existsSync(sourceRelPath)) {
      logger.info(`copying ${sourceRelPath}`)
      copyToDist(sourceRelPath, path.join('./dist', sourceRelPath))
    } else {
      logger.debug(`skipping copying ${sourceRelPath}`)
    }
  }
}

export function generateSiteThemes(): void {
  if (FEATURES.hasOwnProperty('themeGeneration') && FEATURES.themeGeneration) {
    logger.info('generating themes')
    copyThemeAssets()
  }
}
