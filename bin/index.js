#!/usr/bin/env node

// this should be wihtin index
if (process.argv.indexOf('--quiet') !== -1) {
  process.env.SILENT = 'true'
} else if (process.argv.indexOf('--verbose') !== -1) {
  process.env.DEBUG = 'true'
}

require('../dist/index')
