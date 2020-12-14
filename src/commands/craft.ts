import {generateSourceContent} from '../tasks/content'
import {generateSiteThemes} from '../tasks/theme'

export const helpText = 'craft   Generate content from markdown'

export function command(config: {}): void {
  generateSourceContent(config)
  generateSiteThemes(config)
}
