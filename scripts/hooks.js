const cp = require('child_process')
const path = require('path')

function post () {
  const specialCommands = {
    'node-minecraft-data': [
      'rm -rf minecraft-data',
      'ln -s ../minecraft-data minecraft-data',
      'git update-index --skip-worktree minecraft-data'
    ],
    'node-minecraft-assets': [
      'rm -rf minecraft-assets',
      'ln -s ../minecraft-assets minecraft-assets',
      'git update-index --skip-worktree minecraft-assets'
    ]
  }

  for (const name in specialCommands) {
    for (const cmd of specialCommands[name]) {
      console.log(name + ': $', cmd)
      cp.execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '../trees', name) })
    }
  }
}

function pre () {
  const specialCommands = {
    'node-minecraft-data': [
      'rm -rf minecraft-data'
    ],
    'node-minecraft-assets': [
      'rm -rf minecraft-assets'
    ]
  }

  for (const name in specialCommands) {
    for (const cmd of specialCommands[name]) {
      console.log(name + ': $', cmd)
      cp.execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '../trees', name) })
    }
  }
}

module.exports = { pre, post }
