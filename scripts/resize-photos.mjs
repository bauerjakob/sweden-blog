#!/usr/bin/env node
/*
 * PHOTO PIPELINE
 * --------------
 * A 4000px phone photo must never ship as-is. Drop originals (jpg/png/webp)
 * into /photos-src, run `npm run photos`, and this generates a set of
 * width-capped WebP variants into /public/photos plus a manifest of intrinsic
 * dimensions the app uses for srcset + <img width/height> (no layout shift).
 *
 * Output filenames are stable (photos/<name>-<width>.webp), un-hashed, so the
 * build-time Open Graph prerender can point WhatsApp/iMessage at a real URL.
 *
 * Commit both /public/photos and src/content/photos.manifest.json so a clean
 * clone runs `npm run dev` with images already in place.
 */
import { readdir, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = path.join(root, 'photos-src')
const OUT_DIR = path.join(root, 'public', 'photos')
const MANIFEST = path.join(root, 'src', 'content', 'photos.manifest.json')

const WIDTHS = [400, 800, 1200, 1600]
const QUALITY = 80
const EXT_RE = /\.(jpe?g|png|webp|tif?f)$/i

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  let files
  try {
    files = (await readdir(SRC_DIR)).filter((f) => EXT_RE.test(f)).sort()
  } catch {
    console.error(`No /photos-src directory found. Create it and add images.`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.warn('photos-src is empty — nothing to do.')
    return
  }

  const manifest = {}

  for (const file of files) {
    const name = file.replace(EXT_RE, '')
    const input = path.join(SRC_DIR, file)
    const image = sharp(input, { failOn: 'none' }).rotate() // respect EXIF orientation
    const meta = await image.metadata()
    const srcW = meta.width ?? WIDTHS[WIDTHS.length - 1]
    const srcH = meta.height ?? srcW

    const targetWidths = WIDTHS.filter((w) => w <= srcW)
    if (targetWidths.length === 0) targetWidths.push(srcW) // tiny source

    for (const w of targetWidths) {
      const out = path.join(OUT_DIR, `${name}-${w}.webp`)
      await sharp(input, { failOn: 'none' })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(out)
    }

    manifest[name] = { w: srcW, h: srcH, widths: targetWidths }
    console.log(`  ${name}  ${srcW}×${srcH}  → ${targetWidths.join(', ')}`)
  }

  const ordered = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]))
  await writeFile(MANIFEST, JSON.stringify(ordered, null, 2) + '\n')
  console.log(`\nWrote ${files.length} image set(s) → public/photos`)
  console.log(`Manifest → src/content/photos.manifest.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
