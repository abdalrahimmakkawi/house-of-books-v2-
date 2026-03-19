import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const OUTPUT_DIR = './public/icons'

mkdirSync(OUTPUT_DIR, { recursive: true })

for (const size of SIZES) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#06050a'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.18)
  ctx.fill()

  ctx.strokeStyle = '#c9a84c'
  ctx.lineWidth = size * 0.04
  ctx.beginPath()
  ctx.roundRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9, size * 0.14)
  ctx.stroke()

  const fontSize = size * 0.52
  ctx.font = `${fontSize}px serif` 
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('📚', size / 2, size / 2 + size * 0.03)

  const buffer = canvas.toBuffer('image/png')
  writeFileSync(join(OUTPUT_DIR, `icon-${size}.png`), buffer)
  console.log(`✓ icon-${size}.png`)
}

console.log('\n✅ Done! Icons saved to public/icons/')
