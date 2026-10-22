// Turns a TrueType font into the typeface JSON that three's FontLoader (and drei's
// <Text3D>) reads, keeping only the characters the timer draws.
// Usage: node scripts/make-font.mjs <font.ttf> <out.json>
import { readFileSync, writeFileSync } from "node:fs"
import opentype from "opentype.js"

const [, , input, output] = process.argv
const CHARS = "0123456789:-+ ABCDEFGHIJKLMNOPQRSTUVWXYZ"

const buffer = readFileSync(input)
const font = opentype.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
)
const round = (n) => Math.round(n)

const glyphs = {}
for (const char of CHARS) {
  const glyph = font.charToGlyph(char)
  // three reads curves as "end point, then control points".
  const o = glyph.path.commands
    .map((c) => {
      switch (c.type) {
        case "M":
          return `m ${round(c.x)} ${round(c.y)}`
        case "L":
          return `l ${round(c.x)} ${round(c.y)}`
        case "Q":
          return `q ${round(c.x)} ${round(c.y)} ${round(c.x1)} ${round(c.y1)}`
        case "C":
          return `b ${round(c.x)} ${round(c.y)} ${round(c.x1)} ${round(c.y1)} ${round(c.x2)} ${round(c.y2)}`
        default:
          return ""
      }
    })
    .filter(Boolean)
    .join(" ")
  const box = glyph.getBoundingBox()
  glyphs[char] = { ha: round(glyph.advanceWidth), x_min: round(box.x1), x_max: round(box.x2), o }
}

const head = font.tables.head
const post = font.tables.post
writeFileSync(
  output,
  JSON.stringify({
    glyphs,
    familyName: font.names.fontFamily.en,
    ascender: font.ascender,
    descender: font.descender,
    underlinePosition: post.underlinePosition,
    underlineThickness: post.underlineThickness,
    boundingBox: { xMin: head.xMin, yMin: head.yMin, xMax: head.xMax, yMax: head.yMax },
    resolution: font.unitsPerEm,
    original_font_information: {
      copyright: font.names.copyright?.en,
      license: font.names.license?.en,
    },
  }),
)
console.log(`${Object.keys(glyphs).length} glyphs → ${output}`)
