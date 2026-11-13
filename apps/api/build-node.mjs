import { build } from 'esbuild'

await build({
  entryPoints: ['src/node/server.ts'], outfile: 'dist/node.mjs', bundle: true,
  platform: 'node', target: 'node22', format: 'esm',
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
})
