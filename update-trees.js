const fs = require('fs')
const cp = require('child_process')
const exec = cmd => { console.log('$', cmd); cp.execSync(cmd, { stdio: 'inherit' }) }

exec('git config --global protocol.file.allow always')

const files = fs.readdirSync('trees')

for (const file of files) {
  const dir = 'trees/' + file
  if (!fs.lstatSync(dir).isDirectory()) continue
  console.log('Updating tree', file)
  try {
    exec(`git subtree pull --prefix=${dir} ${file} master -m "subtree: pull ${file}/master into ${dir}"`)
  } catch {
    try {
      exec(`git subtree pull --prefix=${dir} ${file} main -m "subtree: pull ${file}/main into ${dir}"`)
    } catch {
      console.error(`Failed to update subtree for ${file}`)
      continue
    }
  }
}
