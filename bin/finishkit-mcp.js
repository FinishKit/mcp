#!/usr/bin/env node
const cmd = process.argv[2]
if (cmd === 'setup') {
  require('../dist/setup-cli.js')
} else if (cmd === 'login') {
  require('../dist/login-cli.js')
} else if (cmd === 'logout') {
  require('../dist/logout-cli.js')
} else {
  require('../dist/index.js')
}
