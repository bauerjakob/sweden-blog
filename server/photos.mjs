import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import crypto from 'node:crypto'
import path from 'node:path'
import { UPLOADS_DIR } from './config.mjs'
import { requireAuth, csrfGuard } from './auth.mjs'
import { slugify } from './content.mjs'

const WIDTHS = [400, 800, 1200, 1600]
const QUALITY = 80

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB original
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

export const photosRouter = express.Router()

// Upload one image; returns responsive-photo metadata for an entry's photo list.
// The heavy 4000px original never ships — it's resized to capped WebP variants.
photosRouter.post('/', csrfGuard, requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const base =
      slugify(path.parse(req.file.originalname).name || 'photo') || 'photo'
    const name = `${base}-${crypto.randomBytes(3).toString('hex')}`

    const pipeline = sharp(req.file.buffer, { failOn: 'none' }).rotate()
    const meta = await pipeline.metadata()
    const srcW = meta.width || WIDTHS[WIDTHS.length - 1]
    const srcH = meta.height || srcW

    const targetWidths = WIDTHS.filter((w) => w <= srcW)
    if (targetWidths.length === 0) targetWidths.push(srcW)

    for (const w of targetWidths) {
      await sharp(req.file.buffer, { failOn: 'none' })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(path.join(UPLOADS_DIR, `${name}-${w}.webp`))
    }

    res.status(201).json({
      photo: { name, w: srcW, h: srcH, widths: targetWidths, dir: 'uploads' },
    })
  } catch (e) {
    next(e)
  }
})
