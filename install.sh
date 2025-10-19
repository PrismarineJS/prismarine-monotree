bun install --ignore-workspace
node scripts/create-trees.js
node scripts/update-trees.js
bun install --ignore-scripts
npm --prefix trees/node-minecraft-data run prepare
npm --prefix trees/node-mojangson run prepublish
node scripts/make-links.js
