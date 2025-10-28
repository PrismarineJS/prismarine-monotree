const fs = require('fs')
const cp = require('child_process')
const path = require('path')
const hooks = require('./hooks')
// wget https://raw.githubusercontent.com/PrismarineJS/prismarine-meta/refs/heads/master/.meta -O repos.json
const { projects } = require('./repos.json')
const exec = cmd => { console.log('$', cmd); cp.execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') }) }

/*
Some git installs may not be compiled with subtree. If command not found, install manually:

git clone https://github.com/git/git.git ~/git-src
cd ~/git-src/contrib/subtree
sudo install -m 0755 git-subtree "$(git --exec-path)/git-subtree"
# or use make
*/
// git subtree add --prefix=trees/repoA git@github.com:you/repoA.git main

exec('git config --global protocol.file.allow always')

for (const name in projects) {
  const url = projects[name]
  const exists = fs.existsSync('trees/' + name)
  exec(`git remote add ${name} ${url} || true`)
  if (exists) {
    console.log('Skipping existing tree', name)
    continue
  }
  try {
    exec(`git subtree add --prefix=trees/${name} ${url} master`)
  } catch {
    try {
      exec(`git subtree add --prefix=trees/${name} ${url} main`)
    } catch {
      console.error(`Failed to add subtree for ${name} from ${url}`)
      continue
    }
  }
}

hooks.post()
