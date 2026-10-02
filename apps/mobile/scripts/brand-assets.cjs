/* global __dirname */
const { Buffer } = require('node:buffer')
const { createRequire } = require('node:module')
const { readFile } = require('node:fs/promises')
const path = require('node:path')

// Use the rasterizer already shipped with the pinned Expo toolchain.
const expo = createRequire(require.resolve('expo/package.json'))
const cli = createRequire(expo.resolve('@expo/cli/package.json'))
const images = createRequire(cli.resolve('@expo/image-utils/package.json'))
const sharp = images('sharp')
const assets = path.join(__dirname, '../assets')

async function main() {
  const source = await readFile(path.join(assets, 'mark.svg'), 'utf8')
  const mark = source.replace(/<svg[^>]*>|<\/svg>/g, '')
  const svg = (size, inset, color, background) => Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    (background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : '') +
    `<svg x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}" viewBox="0 0 24 24" fill="none">` +
    mark.replaceAll('#234F40', color) + '</svg></svg>',
  )
  for (const [file, size, inset, color, background] of [
    ['icon.png', 1024, 192, '#F6F7F2', '#234F40'],
    ['adaptive-icon.png', 1024, 224, '#F6F7F2', null],
    ['monochrome-icon.png', 1024, 224, '#FFFFFF', null],
    ['splash-icon.png', 512, 96, '#234F40', null],
    ['notification-icon.png', 96, 8, '#FFFFFF', null],
    ['favicon.png', 64, 10, '#F6F7F2', '#234F40'],
  ]) {
    await sharp(svg(size, inset, color, background)).png().toFile(path.join(assets, file))
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
