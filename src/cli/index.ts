import * as craft from '../commands/craft'
import * as server from '../commands/server'
import * as fs from 'fs'
import * as path from 'path'
import {logger} from '../utilities/logger'


const DEFAULT_HTTP_PORT = 3001
const commands = {
  craft: craft,
  server: server,
}

logger.updateLevel = function(): void {
  // this should be done better
  if (process.env.SILENT === 'true') {
    logger.level = 'error'
  } else if (process.env.DEBUG === 'true') {
    logger.level = 'debug'
  }
}

const mdCraftMessage = [
  'mdcraft, version NaN',
  '',
  'usage: mdcraft [--verbose|--quiet] <command>',
  '',
]
const mdCraftCommands = [
  'Available commands',
  '',
]

function help(): void {
  const helpMessage: string[] = [
    ...mdCraftMessage,
    ...mdCraftCommands,
  ]

  // eslint-disable-next-line no-console
  console.log(helpMessage.join('\n'))
}

function importPlugins(): void {
  for (const command in commands) {
    mdCraftCommands.push(`   ${commands[command]['helpText']}`)
  }
}

function mdCraftConfig(): any {
  const configFile = `${process.cwd()}/mdcraft.config.js`
  let configData: any = {}

  if (fs.existsSync(configFile)) {
    logger.info(`loading mdcraft config ${configFile}`)
    configData = __non_webpack_require__(configFile)

    if (configData.phonetool && configData.phonetool.enable) {
      if (configData.phonetool.enabled === 'true' || configData.phonetool.enabled === true) {
        process.env.PT_ENABLED = 'true'
      } else {
        process.env.PT_ENABLED = 'false'
      }

      logger.debug(`PT_ENABLED = ${process.env.PT_ENABLED}`)

      if (configData.phonetool.linkUrl) {
        process.env.PT_LINK_URL = configData.phonetool.linkUrl
      }
      if (configData.phonetool.imageUrl) {
        process.env.MDCRAFT_PT_IMAGE_URL = configData.phonetool.imageUrl
      }
    }
    if (configData.server) {
      if (configData.server.port) {
        process.env.MDSERVER_PORT = configData.server.port
      } else {
        process.env.MDSERVER_PORT = DEFAULT_HTTP_PORT.toString()
      }

      logger.debug(`MDSERVER_PORT = ${process.env.MDSERVER_PORT}`)

      if (configData.server.path) {
        process.env.MDSERVER_ROOT = configData.server.path
      } else {
        process.env.MDSERVER_ROOT = path.join(process.cwd(), 'dist')
      }

      logger.debug(`MDSERVER_ROOT = ${process.env.MDSERVER_ROOT}`)
    }
  }

  return configData
}

function run(): void {
  const [,, command, ...args] = process.argv

  const verbose = args.indexOf('--verbose') !== -1
  const silent = args.indexOf('--silent') !== -1

  if (silent) {
    process.env.SILENT === 'true'
  } else if (verbose) {
    process.env.DEBUG === 'true'
  }

  const config = mdCraftConfig()
  importPlugins()

  if (command in commands) {
    commands[command].command(config)
  } else {
    help()
  }
}

run()
