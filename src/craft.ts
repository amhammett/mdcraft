import {generateSourceContent, generateLanding} from './content'
import {generateSiteThemes} from './theme'

export const helpText = 'craft   Generate content from markdown'

export function command(): void {
  generateSourceContent()
  generateSiteThemes()
  generateLanding()
}
