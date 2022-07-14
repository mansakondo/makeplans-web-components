#!/usr/bin/env node

const path      = require("path")
const watchMode = process.argv.includes("--watch")
const onRebuild = {
  onRebuild(error, result) {
    if (error) console.error('watch build failed:', error)
    else console.log('watch build succeeded:', result)
  }
}

require("esbuild").build({
  entryPoints: ["index.js"],
  outdir: path.join(process.cwd(), "builds/"),
  absWorkingDir: path.join(process.cwd(), "./"),
  bundle: true,
  sourcemap: true,
  watch: watchMode ? onRebuild : false,
}).then(() => {
  console.log("Watching...")
}).catch(() => process.exit(1))

