import * as craft from './craft'
import * as server from './server'
import * as fs from 'fs'
import * as path from 'path'

const DEFAULT_HTTP_PORT = 3001
const commands = {
  craft: craft,
  server: server,
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

function mdCraftConfig(verbose: boolean): void {
  const configFile = `${process.cwd()}/.mdcraft.config.json`

  if (fs.existsSync(configFile)) {
    // eslint-disable-next-line no-console
    console.log('loading mdcraft config')

    const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'))
    if (configData.phonetool && configData.phonetool.enable) {
      if (configData.phonetool.enabled === 'true' || configData.phonetool.enabled === true) {
        process.env.PT_ENABLED = 'true'
      } else {
        process.env.PT_ENABLED = 'false'
      }

      // eslint-disable-next-line no-console
      verbose && console.log(`PT_ENABLED = ${process.env.PT_ENABLED}`)

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

      // eslint-disable-next-line no-console
      verbose && console.log(`MDSERVER_PORT = ${process.env.MDSERVER_PORT}`)

      if (configData.server.path) {
        process.env.MDSERVER_ROOT = configData.server.path
      } else {
        process.env.MDSERVER_ROOT = path.join(process.cwd(), 'dist')
      }

      // eslint-disable-next-line no-console
      verbose && console.log(`MDSERVER_ROOT = ${process.env.MDSERVER_ROOT}`)
    }
  }
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

  mdCraftConfig(verbose)
  importPlugins()

  if (command in commands) {
    commands[command].command()
  } else if (command === 'args') {
    // eslint-disable-next-line no-console
    console.log(args)
  } else {
    help()
  }
}

run()
