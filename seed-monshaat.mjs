/**
 * Seed the Monshaat 7-slide template into storage.
 * Run once: node seed-monshaat.mjs
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TMPL_DIR  = join(__dirname, 'storage/templates')
mkdirSync(TMPL_DIR, { recursive: true })

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function svgUri(svg) {
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
}

// Monshaat logo — white text version (for dark teal backgrounds)
const LOGO_WHITE = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 230">
  <text x="260" y="95"  font-family="Arial,sans-serif" font-size="86" font-weight="bold"
        fill="white" text-anchor="middle" direction="rtl">منشآت</text>
  <text x="260" y="140" font-family="Arial,sans-serif" font-size="34" fill="white" text-anchor="middle">monsha'at</text>
  <line x1="80" y1="160" x2="440" y2="160" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <text x="260" y="182" font-family="Arial,sans-serif" font-size="17" fill="rgba(255,255,255,0.75)"
        text-anchor="middle" direction="rtl">الهيئة العامة للمنشآت الصغيرة والمتوسطة</text>
  <text x="260" y="204" font-family="Arial,sans-serif" font-size="14" fill="rgba(255,255,255,0.6)"
        text-anchor="middle">Small &amp; Medium Enterprises General Authority</text>
</svg>`)

// Monshaat logo — teal text version (for light backgrounds, inside white box)
const LOGO_BOX = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 110">
  <rect width="260" height="110" rx="6" fill="white"/>
  <text x="130" y="50"  font-family="Arial,sans-serif" font-size="44" font-weight="bold"
        fill="#2d7ea8" text-anchor="middle" direction="rtl">منشآت</text>
  <text x="130" y="76"  font-family="Arial,sans-serif" font-size="21" fill="#2d7ea8" text-anchor="middle">monsha'at</text>
  <text x="130" y="97"  font-family="Arial,sans-serif" font-size="10" fill="#888" text-anchor="middle" direction="rtl">الهيئة العامة للمنشآت الصغيرة والمتوسطة</text>
</svg>`)

// Small Monshaat logo for slide footers
const LOGO_SMALL = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 70">
  <rect width="170" height="70" rx="4" fill="white"/>
  <text x="85" y="34"  font-family="Arial,sans-serif" font-size="32" font-weight="bold"
        fill="#2d7ea8" text-anchor="middle" direction="rtl">منشآت</text>
  <text x="85" y="56"  font-family="Arial,sans-serif" font-size="16" fill="#2d7ea8" text-anchor="middle">monsha'at</text>
</svg>`)

// Vision 2030 logo
const VISION2030 = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 150">
  <text x="95" y="36"  font-family="Arial,sans-serif" font-size="18" font-weight="bold"
        fill="#1a3766" text-anchor="middle" letter-spacing="2">VISION</text>
  <rect x="15" y="46" width="160" height="66" rx="6" fill="#1a3766"/>
  <text x="95" y="100" font-family="Arial,sans-serif" font-size="52" font-weight="900"
        fill="white" text-anchor="middle">2030</text>
  <text x="95" y="122" font-family="Arial,sans-serif" font-size="10" fill="#555"
        text-anchor="middle" direction="rtl">رؤية المملكة العربية السعودية</text>
  <text x="95" y="136" font-family="Arial,sans-serif" font-size="9" fill="#555"
        text-anchor="middle">Kingdom of Saudi Arabia</text>
</svg>`)

// ─── Element factory helpers ─────────────────────────────────────────────────

let _id = 0
function uid(prefix = 'el') { return `${prefix}_${++_id}_${randomUUID().slice(0,6)}` }

function rect(overrides) {
  return {
    id: uid('rect'), type: 'figure', subType: 'rect',
    opacity: 1, visible: true, selectable: true, removable: true,
    alwaysOnTop: false, showInExport: true,
    rotation: 0, animations: [], blurEnabled: false, blurRadius: 10,
    brightnessEnabled: false, brightness: 0, sepiaEnabled: false, grayscaleEnabled: false,
    filters: {}, shadowEnabled: false, shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 0,
    shadowColor: 'black', shadowOpacity: 1,
    draggable: true, resizable: true, contentEditable: true, styleEditable: true,
    fill: '#cccccc', dash: [], strokeWidth: 0, stroke: 'rgba(0,0,0,0)', cornerRadius: 0,
    ...overrides,
  }
}

function text(overrides) {
  return {
    id: uid('txt'), type: 'text',
    opacity: 1, visible: true, selectable: true, removable: true,
    alwaysOnTop: false, showInExport: true,
    rotation: 0, animations: [], blurEnabled: false, blurRadius: 10,
    brightnessEnabled: false, brightness: 0, sepiaEnabled: false, grayscaleEnabled: false,
    filters: {}, shadowEnabled: false, shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 0,
    shadowColor: 'black', shadowOpacity: 1,
    draggable: true, resizable: true, contentEditable: true, styleEditable: true,
    // fontWeight MUST be a string — Polotno MST defines it as types.string (default "normal")
    // Passing a number (700) causes MST to throw "value is not a string" on loadJSON
    text: '', fontFamily: '29LTAzer', fontSize: 32, fontWeight: 'normal',
    fontStyle: 'normal', textDecoration: '', fill: '#333333',
    align: 'left', verticalAlign: 'top', lineHeight: 1.4,
    letterSpacing: 0, width: 400, height: 60,
    ...overrides,
  }
}

function img(src, x, y, w, h, extra = {}) {
  return {
    id: uid('img'), type: 'image',
    opacity: 1, visible: true, selectable: true, removable: true,
    alwaysOnTop: false, showInExport: true,
    rotation: 0, animations: [], blurEnabled: false, blurRadius: 10,
    brightnessEnabled: false, brightness: 0, sepiaEnabled: false, grayscaleEnabled: false,
    filters: {}, shadowEnabled: false, shadowBlur: 5, shadowOffsetX: 0, shadowOffsetY: 0,
    shadowColor: 'black', shadowOpacity: 1,
    draggable: true, resizable: true, contentEditable: true, styleEditable: true,
    src, x, y, width: w, height: h, cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
    ...extra,
  }
}

// ─── Decorative shape clusters ────────────────────────────────────────────────

// Bottom-left geometric shapes for cover/back (blue tones on dark bg)
function shapeClusterBlue(offsetX = 0, offsetY = 0) {
  return [
    rect({ id: uid('sh'), x: 55+offsetX,  y: 870+offsetY, width: 150, height: 130, cornerRadius: 38, fill: 'rgba(255,255,255,0.18)' }),
    rect({ id: uid('sh'), x: 195+offsetX, y: 890+offsetY, width: 120, height: 110, cornerRadius: 32, fill: 'rgba(255,255,255,0.12)' }),
    rect({ id: uid('sh'), x: 60+offsetX,  y: 985+offsetY, width: 120, height: 100, cornerRadius: 30, fill: 'rgba(74,149,184,0.55)'  }),
    rect({ id: uid('sh'), x: 180+offsetX, y: 995+offsetY, width: 100, height: 88,  cornerRadius: 26, fill: 'rgba(74,149,184,0.38)'  }),
    rect({ id: uid('sh'), x: 285+offsetX, y: 900+offsetY, width: 95,  height: 85,  cornerRadius: 25, fill: 'rgba(255,255,255,0.10)' }),
    rect({ id: uid('sh'), x: 30+offsetX,  y: 950+offsetY, width: 75,  height: 65,  cornerRadius: 20, fill: 'rgba(255,255,255,0.25)' }),
  ]
}

// Bottom-left shapes for back slide (blue + green mix)
function shapeClusterMixed() {
  return [
    rect({ id: uid('sh'), x: 55,  y: 870, width: 150, height: 130, cornerRadius: 38, fill: '#4a95b8' }),
    rect({ id: uid('sh'), x: 195, y: 890, width: 120, height: 110, cornerRadius: 32, fill: '#5bba47' }),
    rect({ id: uid('sh'), x: 60,  y: 985, width: 120, height: 100, cornerRadius: 30, fill: 'white'   }),
    rect({ id: uid('sh'), x: 180, y: 995, width: 100, height: 88,  cornerRadius: 26, fill: '#4a95b8' }),
    rect({ id: uid('sh'), x: 285, y: 900, width: 95,  height: 85,  cornerRadius: 25, fill: '#5bba47' }),
    rect({ id: uid('sh'), x: 30,  y: 950, width: 75,  height: 65,  cornerRadius: 20, fill: 'rgba(255,255,255,0.35)' }),
  ]
}

// Small footer logo helper
function footerLogo() {
  return img(LOGO_SMALL, 40, 982, 170, 70)
}

// ─── Slide builders ───────────────────────────────────────────────────────────

function makeCover() {
  return {
    background: '#2d7ea8',
    children: [
      // Main panel
      rect({ id: uid('panel'), x: 48, y: 48, width: 1824, height: 984, cornerRadius: 68, fill: '#1e5f7c' }),
      // Logo
      img(LOGO_WHITE, 700, 100, 520, 230),
      // Separator line
      rect({ id: uid('line'), x: 550, y: 350, width: 820, height: 3, cornerRadius: 1, fill: 'rgba(255,255,255,0.35)' }),
      // Arabic main title (editable)
      text({ id: uid('title'), x: 160, y: 400, width: 1600, height: 140,
             text: 'اضغط هنا لتعديل العنوان الرئيسي',
             fontSize: 56, fontWeight: 'bold', fill: '#ffffff', align: 'right',
             verticalAlign: 'middle', fontFamily: '29LTAzer' }),
      // Body placeholder text
      text({ id: uid('body'), x: 1100, y: 620, width: 720, height: 220,
             text: 'Body Level One\nBody Level Two\nBody Level Three',
             fontSize: 22, fontWeight: 'normal', fill: 'rgba(255,255,255,0.85)',
             align: 'right', verticalAlign: 'top', fontFamily: '29LTAzer' }),
      // Geometric shapes cluster (bottom-left)
      ...shapeClusterBlue(),
      // Vision 2030 (bottom-right)
      img(VISION2030, 1680, 870, 190, 150),
    ],
  }
}

function makeContentSlide1() {
  return {
    background: '#f2f2f4',
    children: [
      // Rounded frame
      rect({ id: uid('frame'), x: 28, y: 28, width: 1864, height: 1024, cornerRadius: 60, fill: '#e6edf1' }),
      // Arabic section title
      text({ id: uid('title'), x: 160, y: 72, width: 1600, height: 110,
             text: 'عنوان قسم رئيسي',
             fontSize: 62, fontWeight: 'bold', fill: '#2d7ea8', align: 'center',
             verticalAlign: 'middle', fontFamily: '29LTAzer' }),
      // Separator under title
      rect({ id: uid('line'), x: 580, y: 195, width: 760, height: 3, cornerRadius: 1, fill: '#2d7ea8' }),
      // Bullet body text
      text({ id: uid('body'), x: 400, y: 250, width: 1120, height: 340,
             text: '• Body Level One\n• Body Level Two\n• Body Level Three',
             fontSize: 34, fontWeight: 'normal', fill: '#333333', align: 'center',
             verticalAlign: 'top', fontFamily: '29LTAzer' }),
      // Footer logo
      footerLogo(),
    ],
  }
}

function makeContentSlide2() {
  return {
    background: '#f2f2f4',
    children: [
      rect({ id: uid('frame'), x: 28, y: 28, width: 1864, height: 1024, cornerRadius: 60, fill: '#e6edf1' }),
      // Title top-right
      text({ id: uid('title'), x: 900, y: 35, width: 910, height: 80,
             text: 'Title Text',
             fontSize: 44, fontWeight: 'bold', fill: '#2d7ea8', align: 'right',
             verticalAlign: 'middle', fontFamily: '29LTAzer' }),
      // Separator
      rect({ id: uid('line'), x: 900, y: 122, width: 910, height: 3, cornerRadius: 1, fill: '#2d7ea8' }),
      // Bullets — right side, right-aligned
      text({ id: uid('body'), x: 700, y: 160, width: 1150, height: 440,
             text: '• Body Level One\n• Body Level Two\n• Body Level Three\n    ◦ Body Level Four\n    ◦ Body Level Five',
             fontSize: 30, fontWeight: 'normal', fill: '#2d7ea8', align: 'right',
             verticalAlign: 'top', fontFamily: '29LTAzer' }),
      footerLogo(),
    ],
  }
}

function makeContentSlide3() {
  // Same layout as slide2 but with decorative bubbles bottom-right
  return {
    background: '#f2f2f4',
    children: [
      rect({ id: uid('frame'), x: 28, y: 28, width: 1864, height: 1024, cornerRadius: 60, fill: '#e6edf1' }),
      text({ id: uid('title'), x: 900, y: 35, width: 910, height: 80,
             text: 'Title Text',
             fontSize: 44, fontWeight: 'bold', fill: '#2d7ea8', align: 'right',
             verticalAlign: 'middle', fontFamily: '29LTAzer' }),
      rect({ id: uid('line'), x: 900, y: 122, width: 910, height: 3, cornerRadius: 1, fill: '#2d7ea8' }),
      text({ id: uid('body'), x: 700, y: 160, width: 1150, height: 440,
             text: '• Body Level One\n• Body Level Two\n• Body Level Three\n    ◦ Body Level Four\n    ◦ Body Level Five',
             fontSize: 30, fontWeight: 'normal', fill: '#2d7ea8', align: 'right',
             verticalAlign: 'top', fontFamily: '29LTAzer' }),
      // Decorative bubbles bottom-right
      rect({ id: uid('bub'), x: 1480, y: 680, width: 220, height: 200, cornerRadius: 55, fill: 'rgba(45,126,168,0.12)' }),
      rect({ id: uid('bub'), x: 1680, y: 720, width: 180, height: 160, cornerRadius: 48, fill: 'rgba(45,126,168,0.09)' }),
      rect({ id: uid('bub'), x: 1590, y: 855, width: 250, height: 220, cornerRadius: 60, fill: 'rgba(45,126,168,0.07)' }),
      rect({ id: uid('bub'), x: 1800, y: 840, width: 140, height: 130, cornerRadius: 38, fill: 'rgba(45,126,168,0.15)' }),
      footerLogo(),
    ],
  }
}

function makeContentSlide4() {
  // Two-column header bars
  return {
    background: '#f2f2f4',
    children: [
      rect({ id: uid('frame'), x: 28, y: 28, width: 1864, height: 1024, cornerRadius: 60, fill: '#e6edf1' }),
      // Title top-right
      text({ id: uid('title'), x: 900, y: 35, width: 910, height: 80,
             text: 'Title Text',
             fontSize: 44, fontWeight: 'bold', fill: '#2d7ea8', align: 'right',
             verticalAlign: 'middle', fontFamily: '29LTAzer' }),
      // Two blue column headers
      rect({ id: uid('col1'), x: 60,   y: 130, width: 870, height: 55, cornerRadius: 6, fill: '#2d7ea8' }),
      rect({ id: uid('col2'), x: 990,  y: 130, width: 870, height: 55, cornerRadius: 6, fill: '#2d7ea8' }),
      // Body text right-aligned
      text({ id: uid('body'), x: 700, y: 220, width: 1150, height: 440,
             text: '• Body Level One\n• Body Level Two\n• Body Level Three\n    ◦ Body Level Four\n    ◦ Body Level Five',
             fontSize: 30, fontWeight: 'normal', fill: '#2d7ea8', align: 'right',
             verticalAlign: 'top', fontFamily: '29LTAzer' }),
      footerLogo(),
    ],
  }
}

function makeContentSlide5() {
  // Arabic title + large content placeholder box
  return {
    background: '#f2f2f4',
    children: [
      rect({ id: uid('frame'), x: 28, y: 28, width: 1864, height: 1024, cornerRadius: 60, fill: '#e6edf1' }),
      // Arabic title top-center
      text({ id: uid('title'), x: 160, y: 60, width: 1600, height: 110,
             text: 'عنوان قسم رئيسي',
             fontSize: 62, fontWeight: 'bold', fill: '#2d7ea8', align: 'center',
             verticalAlign: 'middle', fontFamily: '29LTAzer' }),
      rect({ id: uid('line'), x: 580, y: 180, width: 760, height: 3, cornerRadius: 1, fill: '#2d7ea8' }),
      // Large rounded content placeholder box
      rect({ id: uid('box'), x: 200, y: 220, width: 1520, height: 700, cornerRadius: 70, fill: '#dde4e9' }),
      footerLogo(),
    ],
  }
}

function makeBack() {
  return {
    background: '#2d7ea8',
    children: [
      rect({ id: uid('panel'), x: 48, y: 48, width: 1824, height: 984, cornerRadius: 68, fill: '#1e5f7c' }),
      // Centered logo box (white bg)
      img(LOGO_BOX, 830, 280, 260, 110),
      // Body text centered
      text({ id: uid('body'), x: 560, y: 430, width: 800, height: 120,
             text: 'Body Level One',
             fontSize: 28, fontWeight: 'normal', fill: 'rgba(255,255,255,0.85)',
             align: 'center', verticalAlign: 'middle', fontFamily: '29LTAzer' }),
      // Mixed color shapes cluster
      ...shapeClusterMixed(),
    ],
  }
}

// ─── Assemble template ────────────────────────────────────────────────────────

const W = 1920, H = 1080

const slideDefs = [
  { role: 'cover', ...makeCover()         },
  { role: 'slide', ...makeContentSlide1() },
  { role: 'slide', ...makeContentSlide2() },
  { role: 'slide', ...makeContentSlide3() },
  { role: 'slide', ...makeContentSlide4() },
  { role: 'slide', ...makeContentSlide5() },
  { role: 'back',  ...makeBack()          },
]

const pages = slideDefs.map((s, i) => ({
  role: s.role,
  polotnoJson: {
    id: `page_ms_${i}`,
    width:  W,
    height: H,
    background: s.background,
    bleed: 0,
    custom: { role: s.role },
    duration: 5000,
    children: s.children,
  },
}))

const template = {
  id: 'tpl_monshaat',
  name: 'Monshaat Template',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  thumbnail: '',
  textStyles: {
    title:    { font: '29LTAzer', size: 56, color: '#2d7ea8', weight: 'bold' },
    subtitle: { font: '29LTAzer', size: 34, color: '#2d7ea8' },
    body:     { font: '29LTAzer', size: 26, color: '#333333' },
    caption:  { font: '29LTAzer', size: 18, color: '#888888' },
    tag:      { font: '29LTAzer', size: 18, color: '#ffffff', background: '#2d7ea8' },
  },
  fonts: ['29LTAzer'],
  pages,
  bindings: {},
  componentLibrary: [],
}

const outPath = join(TMPL_DIR, 'tpl_monshaat.json')
writeFileSync(outPath, JSON.stringify(template, null, 2))
console.log(`✓ Monshaat template written → ${outPath}`)
console.log(`  Pages: ${pages.length} (${pages.map(p => p.role).join(', ')})`)
pages.forEach((p, i) => {
  console.log(`  Page ${i+1} [${p.role}]: ${p.polotnoJson.children.length} elements, bg=${p.polotnoJson.background}`)
})
