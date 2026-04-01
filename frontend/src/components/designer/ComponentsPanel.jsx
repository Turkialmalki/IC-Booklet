// Polotno reliably supports: type='figure' subType='rect' (with cornerRadius for circles)
// For triangle / star / arrow use type='svg' with an inline SVG data URL

const s = (svg) => `data:image/svg+xml;base64,${btoa(svg)}`

const IMG_PH     = s('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="140"><rect width="180" height="140" fill="#374151"/><text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">Image</text></svg>')
const ARROW_SVG  = s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 60"><polygon points="0,18 95,18 95,0 160,30 95,60 95,42 0,42" fill="#10B981"/></svg>')
const TRI_SVG    = s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><polygon points="60,4 116,116 4,116" fill="#F59E0B"/></svg>')
const STAR_SVG   = s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><polygon points="60,5 74,45 115,45 83,68 94,108 60,82 26,108 37,68 5,45 46,45" fill="#F59E0B"/></svg>')
const HEART_SVG  = s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110"><path d="M60,95 C60,95 10,60 10,30 C10,14 22,5 36,5 C47,5 56,12 60,20 C64,12 73,5 84,5 C98,5 110,14 110,30 C110,60 60,95 60,95Z" fill="#E94560"/></svg>')
const DIAMOND_SVG= s('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120"><polygon points="50,2 98,55 50,118 2,55" fill="#8B5CF6"/></svg>')

const CATEGORIES = [
  {
    label: 'Shapes',
    items: [
      {
        id: 'rect',
        label: 'Rectangle',
        description: 'Filled rounded rectangle',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 240, height: 120, fill: '#3B82F6', cornerRadius: 8 },
        ],
      },
      {
        id: 'circle',
        label: 'Circle',
        description: 'Filled ellipse / circle',
        elements: [
          { type: 'figure', subType: 'rect', cornerRadius: 9999, x: 0, y: 0, width: 120, height: 120, fill: '#8B5CF6' },
        ],
      },
      {
        id: 'triangle',
        label: 'Triangle',
        description: 'Filled triangle',
        elements: [
          { type: 'svg', x: 0, y: 0, width: 120, height: 120, src: TRI_SVG },
        ],
      },
      {
        id: 'star',
        label: 'Star',
        description: 'Five-point star',
        elements: [
          { type: 'svg', x: 0, y: 0, width: 120, height: 120, src: STAR_SVG },
        ],
      },
      {
        id: 'arrow',
        label: 'Arrow',
        description: 'Arrow shape',
        elements: [
          { type: 'svg', x: 0, y: 0, width: 160, height: 60, src: ARROW_SVG },
        ],
      },
      {
        id: 'divider',
        label: 'Divider',
        description: 'Horizontal rule',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 500, height: 3, fill: '#E5E7EB', cornerRadius: 2 },
        ],
      },
    ],
  },
  {
    label: 'Text Blocks',
    items: [
      {
        id: 'heading',
        label: 'Heading',
        description: 'Large bold title',
        elements: [
          { type: 'text', x: 0, y: 0, width: 600, height: 60, text: 'Section Heading', fontSize: 40, fill: '#111827', fontWeight: 'bold' },
        ],
      },
      {
        id: 'body_text',
        label: 'Body Text',
        description: 'Paragraph text block',
        elements: [
          { type: 'text', x: 0, y: 0, width: 500, height: 80, text: 'Body text goes here. Replace with your content.', fontSize: 16, fill: '#374151' },
        ],
      },
      {
        id: 'quote_block',
        label: 'Quote Block',
        description: 'Accent bar + quote text',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 6, height: 80, fill: '#3B82F6', cornerRadius: 3 },
          { type: 'text', x: 22, y: 8, width: 420, height: 64, text: '"Your quote goes here."', fontSize: 18, fill: '#1A1A2E', fontStyle: 'italic' },
        ],
      },
      {
        id: 'badge',
        label: 'Tag Badge',
        description: 'Colored label pill',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 120, height: 34, fill: '#E94560', cornerRadius: 17 },
          { type: 'text', x: 12, y: 7, width: 96, height: 20, text: 'Tag', fontSize: 14, fill: '#FFFFFF', fontWeight: 'bold', align: 'center' },
        ],
      },
    ],
  },
  {
    label: 'Data / Stats',
    items: [
      {
        id: 'stat_box',
        label: 'Stat Box',
        description: 'Number + label pair',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 200, height: 100, fill: '#F3F4F6', cornerRadius: 8 },
          { type: 'text', x: 16, y: 12, width: 168, height: 44, text: '42', fontSize: 36, fill: '#1A1A2E', fontWeight: 'bold' },
          { type: 'text', x: 16, y: 60, width: 168, height: 28, text: 'Metric Label', fontSize: 14, fill: '#6B7280' },
        ],
      },
      {
        id: 'kpi_card',
        label: 'KPI Card',
        description: 'Card with colored accent top',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 220, height: 120, fill: '#FFFFFF', cornerRadius: 10, stroke: '#E5E7EB', strokeWidth: 1 },
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 220, height: 6, fill: '#3B82F6', cornerRadius: 10 },
          { type: 'text', x: 16, y: 20, width: 188, height: 48, text: '$1.2M', fontSize: 32, fill: '#111827', fontWeight: 'bold' },
          { type: 'text', x: 16, y: 72, width: 188, height: 24, text: 'Total Revenue', fontSize: 13, fill: '#6B7280' },
        ],
      },
      {
        id: 'progress_bar',
        label: 'Progress Bar',
        description: 'Labelled progress bar',
        elements: [
          { type: 'text', x: 0, y: 0, width: 300, height: 24, text: 'Progress', fontSize: 14, fill: '#374151', fontWeight: 'bold' },
          { type: 'figure', subType: 'rect', x: 0, y: 28, width: 300, height: 12, fill: '#E5E7EB', cornerRadius: 6 },
          { type: 'figure', subType: 'rect', x: 0, y: 28, width: 195, height: 12, fill: '#3B82F6', cornerRadius: 6 },
          { type: 'text', x: 200, y: 24, width: 100, height: 24, text: '65%', fontSize: 13, fill: '#3B82F6', fontWeight: 'bold' },
        ],
      },
      {
        id: 'two_col_stats',
        label: '2-Column Stats',
        description: 'Two stat boxes side by side',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 160, height: 90, fill: '#EFF6FF', cornerRadius: 8 },
          { type: 'text', x: 12, y: 10, width: 136, height: 40, text: '128', fontSize: 30, fill: '#1D4ED8', fontWeight: 'bold' },
          { type: 'text', x: 12, y: 55, width: 136, height: 22, text: 'Investors', fontSize: 13, fill: '#6B7280' },
          { type: 'figure', subType: 'rect', x: 176, y: 0, width: 160, height: 90, fill: '#F0FDF4', cornerRadius: 8 },
          { type: 'text', x: 188, y: 10, width: 136, height: 40, text: '94%', fontSize: 30, fill: '#16A34A', fontWeight: 'bold' },
          { type: 'text', x: 188, y: 55, width: 136, height: 22, text: 'Success Rate', fontSize: 13, fill: '#6B7280' },
        ],
      },
    ],
  },
  {
    label: 'Tables',
    items: [
      {
        id: 'table_2row',
        label: 'Simple Table (3×2)',
        description: 'Header + 2 data rows',
        elements: [
          // Header row bg
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 540, height: 36, fill: '#1E3A5F', cornerRadius: 0 },
          { type: 'text', x: 8, y: 8, width: 170, height: 20, text: 'Column A', fontSize: 13, fill: '#FFFFFF', fontWeight: 'bold' },
          { type: 'text', x: 188, y: 8, width: 170, height: 20, text: 'Column B', fontSize: 13, fill: '#FFFFFF', fontWeight: 'bold' },
          { type: 'text', x: 368, y: 8, width: 164, height: 20, text: 'Column C', fontSize: 13, fill: '#FFFFFF', fontWeight: 'bold' },
          // Row 1
          { type: 'figure', subType: 'rect', x: 0, y: 36, width: 540, height: 34, fill: '#F8FAFC', cornerRadius: 0 },
          { type: 'text', x: 8, y: 44, width: 170, height: 18, text: 'Value 1', fontSize: 13, fill: '#374151' },
          { type: 'text', x: 188, y: 44, width: 170, height: 18, text: 'Value 2', fontSize: 13, fill: '#374151' },
          { type: 'text', x: 368, y: 44, width: 164, height: 18, text: 'Value 3', fontSize: 13, fill: '#374151' },
          // Row 2
          { type: 'figure', subType: 'rect', x: 0, y: 70, width: 540, height: 34, fill: '#FFFFFF', cornerRadius: 0 },
          { type: 'text', x: 8, y: 78, width: 170, height: 18, text: 'Value 4', fontSize: 13, fill: '#374151' },
          { type: 'text', x: 188, y: 78, width: 170, height: 18, text: 'Value 5', fontSize: 13, fill: '#374151' },
          { type: 'text', x: 368, y: 78, width: 164, height: 18, text: 'Value 6', fontSize: 13, fill: '#374151' },
          // Bottom border
          { type: 'figure', subType: 'rect', x: 0, y: 104, width: 540, height: 2, fill: '#E5E7EB', cornerRadius: 0 },
          // Column dividers
          { type: 'figure', subType: 'rect', x: 180, y: 0, width: 1, height: 106, fill: '#E5E7EB', cornerRadius: 0 },
          { type: 'figure', subType: 'rect', x: 360, y: 0, width: 1, height: 106, fill: '#E5E7EB', cornerRadius: 0 },
        ],
      },
      {
        id: 'table_header_only',
        label: 'Table Header Strip',
        description: 'Dark header bar for tables',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 600, height: 40, fill: '#0F172A', cornerRadius: 6 },
          { type: 'text', x: 12, y: 10, width: 180, height: 20, text: 'Name', fontSize: 14, fill: '#F1F5F9', fontWeight: 'bold' },
          { type: 'text', x: 212, y: 10, width: 180, height: 20, text: 'Category', fontSize: 14, fill: '#F1F5F9', fontWeight: 'bold' },
          { type: 'text', x: 412, y: 10, width: 180, height: 20, text: 'Value', fontSize: 14, fill: '#F1F5F9', fontWeight: 'bold' },
        ],
      },
    ],
  },
  {
    label: 'Layout',
    items: [
      {
        id: 'image_card',
        label: 'Image + Text',
        description: 'Side-by-side layout',
        elements: [
          { type: 'image', x: 0, y: 0, width: 180, height: 140, src: IMG_PH },
          { type: 'text', x: 196, y: 8, width: 300, height: 40, text: 'Title Here', fontSize: 24, fill: '#1A1A2E', fontWeight: 'bold' },
          { type: 'text', x: 196, y: 56, width: 300, height: 80, text: 'Description text goes here.', fontSize: 14, fill: '#6B7280' },
        ],
      },
      {
        id: 'circle_accent',
        label: 'Circle Accent',
        description: 'Decorative filled circle',
        elements: [
          { type: 'figure', subType: 'rect', cornerRadius: 9999, x: 0, y: 0, width: 80, height: 80, fill: '#3B82F6' },
        ],
      },
      {
        id: 'section_header',
        label: 'Section Header',
        description: 'Full-width colored band',
        elements: [
          { type: 'figure', subType: 'rect', x: 0, y: 0, width: 800, height: 56, fill: '#1E3A5F', cornerRadius: 6 },
          { type: 'text', x: 24, y: 12, width: 752, height: 32, text: 'Section Title', fontSize: 22, fill: '#FFFFFF', fontWeight: 'bold' },
        ],
      },
      {
        id: 'avatar_name',
        label: 'Avatar + Name',
        description: 'Profile image with name and role',
        elements: [
          { type: 'figure', subType: 'rect', cornerRadius: 9999, x: 0, y: 0, width: 72, height: 72, fill: '#3B82F6' },
          { type: 'text', x: 88, y: 8, width: 260, height: 32, text: 'Full Name', fontSize: 22, fill: '#111827', fontWeight: 'bold' },
          { type: 'text', x: 88, y: 44, width: 260, height: 22, text: 'Job Title', fontSize: 14, fill: '#6B7280' },
        ],
      },
    ],
  },
]

export default function ComponentsPanel({ store }) {
  function insertComponent(component) {
    const page = store.activePage
    if (!page) return
    const baseX = 100
    const baseY = 100
    for (const el of component.elements) {
      try {
        page.addElement({
          ...el,
          id: `${component.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x: baseX + (el.x || 0),
          y: baseY + (el.y || 0),
        })
      } catch (err) {
        console.warn('addElement failed for', el.type, err.message)
      }
    }
  }

  return (
    <div className="space-y-4">
      {CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#8b949e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            {cat.label}
          </p>
          <div className="space-y-1">
            {cat.items.map((comp) => (
              <button
                key={comp.id}
                onClick={() => insertComponent(comp)}
                className="w-full text-left rounded-lg px-3 py-2 transition-colors"
                style={{ background: '#21262d', border: '1px solid #30363d', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#30363d' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#21262d' }}
              >
                <p style={{ fontSize: 13, fontWeight: 500, color: '#c9d1d9', margin: 0 }}>{comp.label}</p>
                <p style={{ fontSize: 11, color: '#8b949e', margin: '2px 0 0' }}>{comp.description}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
