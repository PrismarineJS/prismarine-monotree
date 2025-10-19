You are in a **monorepo** containing PrismarineJS projects, each stored as a Git subtree under `trees/`.

## Setup Environment

The workspace is usually setup for you ahead of time. If you need to reset it, run `bash ./install.sh`.
This will create trees if they don't exist, update them with latest upstreams and then use `bun` (for speed)
to install the deps. We use `--ignore-scripts` as there are some broken scripts in some deps, then manually
run what scripts needs to be run.

That said, use `npm` and `node` for running scripts for compatibility as Bun does not have full Node.js compat.

`./install.sh` for reference includes:
```sh
node scripts/create-trees.js
node scripts/update-trees.js
# in root here
bun install --ignore-scripts
# manually run some scripts
npm --prefix trees/node-minecraft-data run prepare
npm --prefix trees/node-mojangson run prepublish
# manually fix some package issues
node scripts/make-links.js
```

## Notes

Most projects are node.js, but not all. Refer to README.md and other markdown files as documentation.
You can `ls -R | grep .md` inside a tree to search for docs.

mineflayer, node-minecraft-protocol and bedrock-protocol both support many projects. As such, running `npm test` will take a very long time since they spawn servers.
Instead, try running `pretest` and directly invoking mocha. 

Most projects prefix tests with `<version>v`. So try `npx mocha --exit -g "1.20v"` where `1.20` would be the version you want to test.

For reference, to find the list of supported versions in a project (relevant to find latest version):
* mineflayer/ lists supported versions in lib/version.js.
* node-minecraft-protocol/ lists supported versions in src/version.js
* bedrock-protocol/ in src/options.js

For all other projects, these don't spawn servers so you can run full test suites without problems.

## Examples

Prompt: "Why are mineflayer tests failing?"
You:
```md
I need to locate the mineflayer repo, then test it.
> ls trees
Let me understand the project structure.
> cd trees/mineflayer && ls
> cat package.json
> ls -R test
OK, let's run the tests to see what the issues are.
> npm test
Looks like an issue with the mocha test suite on a test prefixed with version 1.20. Let me run mocha again directly for this test, with `--bail` to fail-fast.
> npx mocha --exit --bail -g "1.20v | tail -100
Looks like an issue with enchanting tables. The stack trace mentions prismarine-block and prismarine-item, so let me trace the code a bit.
> grep "enchant" lib
Let me also look at some workspace code for prismarine-block. Let me search it for some docs.
> ls -R ../prismarine-block | grep .md
Just a readme and API doc. Let me continue first, then if I get stuck I can look at the doc.
> grep "enchant" ../prismarine-block
Looks like an async issue! We need to await this call.
> sed ... 
Now let me try tests again.
> npx mocha --exit --bail -g "1.20v | tail -100
Great! Tests are passing.
```