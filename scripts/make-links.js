  // Bun install in monorepo can't handle file:. So we create symlinks manually
const fs = require('fs')
const cp = require('child_process')
const path = require('path')
const exec = cmd => { console.log('$', cmd); cp.execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') }) }

const files = fs.readdirSync('trees')

for (const file of files) {
  const dir = 'trees/' + file
  if (!fs.lstatSync(dir).isDirectory()) continue
  // cd $x && cd node_modules && ln -s .. $x
  if (fs.existsSync(path.join(dir, 'package.json'))) {
    const nodeModulesDir = path.join(dir, 'node_modules')
    if (!fs.existsSync(nodeModulesDir)) continue
    const linkPath = path.join(nodeModulesDir, file)
    if (fs.existsSync(linkPath)) {
      console.log('  Skipping existing link', linkPath)
      continue
    }
    console.log('Creating symlink for', file)
    fs.symlinkSync(path.join('..', '..', file), linkPath, 'dir')
  }
}
