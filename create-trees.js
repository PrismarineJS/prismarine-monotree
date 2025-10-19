const fs = require('fs')
const cp = require('child_process')
const path = require('path')
const { projects } = JSON.parse(fs.readFileSync(require.resolve('prismarine-meta/.meta'), 'utf-8'))
const exec = cmd => { console.log('$', cmd); cp.execSync(cmd, { stdio: 'inherit', cwd: __dirname }) }

/*
Some git installs may not be compiled with subtree. If command not found, install manually:

git clone https://github.com/git/git.git ~/git-src
cd ~/git-src/contrib/subtree
sudo install -m 0755 git-subtree "$(git --exec-path)/git-subtree"
# or use make
*/
// git subtree add --prefix=trees/repoA git@github.com:you/repoA.git main

exec('git config --global protocol.file.allow always')

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

for (const name in projects) {
  const url = projects[name]
  const exists = fs.existsSync('trees/' + name)
  if (exists) {
    console.log('Skipping existing tree', name)
    continue
  }
  exec(`git remote add ${name} ${url} || true`)
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

for (const name in specialCommands) {
  for (const cmd of specialCommands[name]) {
    console.log(name + ': $', cmd)
    cp.execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, 'trees', name) })
  }
}
