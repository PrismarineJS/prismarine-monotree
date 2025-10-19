You are in a monorepo comprised of git trees for PrismarineJS projects.

## Setup Environment

The workspace is usually setup for you ahead of time. Otherwise, use `pnpm` to install dependencies for speed as there are many. 
Always with `--ignore-scripts` (there are some broken scripts in some deps).
Otherwise, use npm and node for running scripts for compatibility.

```sh
# in root here
pnpm install --ignore-scripts
# manually run some scripts
npm --prefix trees/node-minecraft-data run prepare
npm --prefix trees/node-mojangson run prepublish
```
