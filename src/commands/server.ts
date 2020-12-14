import * as fs from 'fs'
import * as path from 'path'
import * as url from 'url'
import {createServer, IncomingMessage, ServerResponse} from 'http'
import {logger} from '../utilities/logger'

export const helpText = 'server     Start a local server to serve content'

function getMimeType(extension: string): string {
  const map: {[key: string]: string} = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
  }

  return map[extension] || 'text/plain'
}

function getFileContents(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8')
}

function indexExists(filePath: string): boolean {
  let hasIndex = false

  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory() && fs.existsSync(`${filePath}/index.html`)) {
    hasIndex = true
  }

  return hasIndex
}

export function command(config: any): void {
  const HTTP_SERVER_PORT = config.server?.port || '3001'
  const HTTP_SERVER_ROOT = process.env.MDSERVER_ROOT || path.join(process.cwd(), 'dist')
  const DEFAULT_ERROR_PAGE = path.join(HTTP_SERVER_ROOT, 'error.html')

  logger.updateLevel('')

  createServer((request: IncomingMessage, response: ServerResponse) => {
    logger.info(`${request.method} ${request.url}`)
    let errorPage

    if (fs.existsSync(DEFAULT_ERROR_PAGE)) {
      errorPage = getFileContents(DEFAULT_ERROR_PAGE)
    } else {
      errorPage = '<!doctype html><html><head><title>error</title></head><body></body></html>'
    }

    const parsedUrl = url.parse(request.url || '/')
    if (parsedUrl.pathname) {
      const requestPath = path.join(HTTP_SERVER_ROOT, parsedUrl.pathname)
      logger.debug(requestPath)

      if (indexExists(requestPath)) {
        logger.debug('found index')
        response.end(getFileContents(`${requestPath}/index.html`))
      } else if (fs.existsSync(requestPath) && !fs.lstatSync(requestPath).isDirectory()) {
        try {
          response.statusCode = 200
          const contentType = getMimeType(path.parse(requestPath).ext)
          response.setHeader('Content-type', contentType)
          logger.info(contentType)

          const stream = fs.createReadStream(requestPath)
          stream.on('open', function () {
            response.setHeader('Content-Type', contentType)
            stream.pipe(response)
          })
        } catch (error) {
          response.statusCode = 500
          response.end(errorPage)
        }
      } else {
        response.statusCode = 404
        response.end(errorPage)
      }

    }
  }).listen(HTTP_SERVER_PORT, () => {
    logger.info(`Server listening on port ${HTTP_SERVER_PORT}`)
  })
}
