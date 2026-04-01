import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api.js'
import { observer } from 'mobx-react-lite'
import { createStore } from 'polotno/model/store'
import { PolotnoContainer, WorkspaceWrap } from 'polotno/polotno-app'
import { Workspace } from 'polotno/canvas/workspace'
import { Toolbar } from 'polotno/toolbar/toolbar'
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons'

// Floating bar for per-element RTL / font-weight / align controls
const ElementBar = observer(({ store }) => {
  const sel = store.selectedElements?.filter(e => e.type === 'text') || []
  if (sel.length === 0) return null
  const el = sel[0]
  const isRtl = el.align === 'right'

  function toggleRtl() {
    sel.forEach(e => e.set({ align: isRtl ? 'left' : 'right' }))
  }

  const weights = ['Thin','ExtraLight','Light','Regular','Medium','Bold','Black']
  const weightMap = { Thin:100, ExtraLight:200, Light:300, Regular:400, Medium:500, Bold:700, Black:900 }
  const reverseMap = { 100:'Thin',200:'ExtraLight',300:'Light',400:'Regular',500:'Medium',700:'Bold',900:'Black' }
  const currentWeight = reverseMap[el.fontWeight] || (el.fontWeight === 'bold' ? 'Bold' : 'Regular')

  function setWeight(w) {
    sel.forEach(e => e.set({ fontWeight: weightMap[w] }))
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      background: '#161b22',
      borderBottom: '1px solid #21262d',
      fontSize: 12,
      color: '#c9d1d9',
    }}>
      <span style={{ color: '#8b949e', fontSize: 11 }}>Text:</span>

      {/* RTL / LTR toggle */}
      <button
        onClick={toggleRtl}
        title="Toggle RTL / LTR for this element"
        style={{
          padding: '2px 10px', borderRadius: 4, border: '1px solid #30363d',
          background: isRtl ? '#1f6feb' : '#21262d',
          color: isRtl ? '#fff' : '#c9d1d9',
          cursor: 'pointer', fontWeight: 600, fontSize: 12,
        }}
      >
        {isRtl ? 'RTL ←' : '→ LTR'}
      </button>

      {/* Weight picker */}
      <select
        value={currentWeight}
        onChange={e => setWeight(e.target.value)}
        title="Font weight for this element"
        style={{
          padding: '2px 6px', borderRadius: 4, border: '1px solid #30363d',
          background: '#21262d', color: '#c9d1d9', fontSize: 12, cursor: 'pointer',
        }}
      >
        {weights.map(w => <option key={w} value={w}>{w}</option>)}
      </select>

      {sel.length > 1 && (
        <span style={{ color: '#8b949e', fontSize: 11 }}>{sel.length} elements</span>
      )}
    </div>
  )
})

import PagesPanel from '../components/designer/PagesPanel.jsx'
import PlaceholderPanel from '../components/designer/PlaceholderPanel.jsx'
import TextStylesPanel from '../components/designer/TextStylesPanel.jsx'
import ComponentsPanel from '../components/designer/ComponentsPanel.jsx'
import IconsPanel from '../components/designer/IconsPanel.jsx'
import FontsManager from '../components/designer/FontsManager.jsx'
import ImagesPanel from '../components/designer/ImagesPanel.jsx'

const store = createStore({ key: 'nFA5H9elEytDyPyvKL7T', showCredit: false })
store.setSize(1920, 1080)

// Register 29LT Azer — ONE addFont call with a styles array so every weight
// gets its own @font-face rule (font-weight: 700 → Bold.ttf, etc.).
// Calling addFont multiple times with the same fontFamily overwrites each
// previous entry, leaving only font-weight:normal — that causes the 30-second
// "Timeout triggered for loader" error when Polotno tries to load 'bold'.
const _AZER_BASE = `${window.location.origin}/src/assets/fonts`
store.addFont?.({
  fontFamily: '29LTAzer',
  url: `${_AZER_BASE}/29LTAzer-Regular.ttf`,
  styles: [
    { src: `url("${_AZER_BASE}/29LTAzer-Thin.ttf")`,       fontWeight: '100', fontStyle: 'normal' },
    { src: `url("${_AZER_BASE}/29LTAzer-ExtraLight.ttf")`,  fontWeight: '200', fontStyle: 'normal' },
    { src: `url("${_AZER_BASE}/29LTAzer-Light.ttf")`,       fontWeight: '300', fontStyle: 'normal' },
    { src: `url("${_AZER_BASE}/29LTAzer-Regular.ttf")`,     fontWeight: '400', fontStyle: 'normal' },
    { src: `url("${_AZER_BASE}/29LTAzer-Medium.ttf")`,      fontWeight: '500', fontStyle: 'normal' },
    { src: `url("${_AZER_BASE}/29LTAzer-Bold.ttf")`,        fontWeight: '700', fontStyle: 'normal' },
    { src: `url("${_AZER_BASE}/29LTAzer-Black.ttf")`,       fontWeight: '900', fontStyle: 'normal' },
  ],
})

// Hide any Polotno trial / credit DOM nodes that slip through
function hidePolotnoCredit() {
  document.querySelectorAll('a, div, span, p').forEach(el => {
    const text = el.textContent || ''
    if (
      text.includes('polotno.com') ||
      text.includes('Free trial') ||
      text.includes('free trial') ||
      text.includes('Powered by') ||
      text.includes('Get a license')
    ) {
      const rect = el.getBoundingClientRect()
      // Only hide small inline credit nodes, not large containers
      if (rect.height < 60) el.style.display = 'none'
    }
  })
}

const SIDEBAR_TABS = [
  { id: 'pages', label: 'Pages', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )},
  { id: 'placeholders', label: 'Data', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  )},
  { id: 'textstyles', label: 'Styles', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  )},
  { id: 'components', label: 'Blocks', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  )},
  { id: 'icons', label: 'Icons', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { id: 'images', label: 'Images', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { id: 'fonts', label: 'Fonts', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )},
]

export default function Editor() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState(null)
  const [templateName, setTemplateName] = useState('')
  const [activeTab, setActiveTab] = useState('pages')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'saved' | 'error' | null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!templateId) { navigate('/dashboard'); return }
    loadTemplate()
  }, [templateId])

  // Continuously suppress Polotno credit/trial DOM nodes
  useEffect(() => {
    hidePolotnoCredit()
    const observer = new MutationObserver(() => hidePolotnoCredit())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  async function loadTemplate() {
    try {
      setLoading(true)
      const { data } = await api.get(`/api/templates/${templateId}`)
      setTemplate(data)
      setTemplateName(data.name || 'Untitled')

      // Load pages into Polotno store
      if (data.pages && data.pages.length > 0) {
        const VALID_TYPES = new Set(['text', 'image', 'svg', 'figure', 'video'])
        const firstPage = data.pages[0]?.polotnoJson || {}

        // store.loadJSON is the only correct way to restore elements from JSON
        // MST requires all element ids to be globally unique across the whole tree,
        // so we prefix each element id with its page index to avoid collisions.
        // Polotno 2.x stores page-level width/height as "auto" (string).
        // parseInt("auto") → NaN; NaN || fallback → fallback number.
        const canvasW = parseInt(firstPage.width,  10) || 1920
        const canvasH = parseInt(firstPage.height, 10) || 1080
        store.loadJSON({
          width:  canvasW,
          height: canvasH,
          pages: data.pages.map((page, pi) => ({
            ...(page.polotnoJson || {}),
            custom: { role: page.role || 'slide' },
            children: ((page.polotnoJson?.children) || [])
              .filter(el => VALID_TYPES.has(el.type))
              .map(el => ({ ...el, id: `p${pi}_${el.id}` })),
          })),
        })
      } else {
        // Default: add cover, slide, back pages
        store.clear()
        const cover = store.pages[0] || store.addPage()
        cover.set({ custom: { role: 'cover' } })
        const slide = store.addPage()
        slide.set({ custom: { role: 'slide' } })
        const back = store.addPage()
        back.set({ custom: { role: 'back' } })
      }
    } catch (err) {
      console.error('Failed to load template', err)
    } finally {
      setLoading(false)
    }
  }

  async function saveTemplate() {
    if (!template) return
    try {
      setSaving(true)
      setSaveStatus(null)

      // Serialize Polotno store pages.
      // Strip the load-time page-index prefix (p<N>_) from element ids so the
      // saved JSON keeps the original short ids and round-trips cleanly.
      const stripPrefix = (pi, children) =>
        (children || []).map(el => ({
          ...el,
          id: el.id?.replace(new RegExp(`^p${pi}_`), '') ?? el.id,
        }))

      const storeJson = store.toJSON()
      // Polotno 2.x serialises page width/height as "auto"; normalise to
      // explicit numbers so templates round-trip without MST errors on reload.
      const canvasW = store.width  || 1920
      const canvasH = store.height || 1080
      const pages = storeJson.pages.map((p, i) => ({
        // Prefer the role from the serialised JSON (most reliable), then fall back
        // to the live MobX model, then to a positional default.
        role: p.custom?.role || store.pages[i]?.custom?.role || (i === 0 ? 'cover' : i === storeJson.pages.length - 1 ? 'back' : 'slide'),
        polotnoJson: { ...p, width: canvasW, height: canvasH, children: stripPrefix(i, p.children) },
      }))

      // Generate thumbnail from first page
      let thumbnail = template.thumbnail
      try {
        if (store.pages[0]) {
          thumbnail = await store.pages[0].toDataURL({ pixelRatio: 0.5 })
        }
      } catch {}

      const updated = {
        ...template,
        name: templateName,
        pages,
        thumbnail,
      }

      const { data } = await api.put(`/api/templates/${templateId}`, updated)
      setTemplate(data)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const activePanel = {
    pages: <PagesPanel store={store} template={template} onTemplateChange={setTemplate} />,
    placeholders: <PlaceholderPanel store={store} template={template} onTemplateChange={setTemplate} />,
    textstyles: <TextStylesPanel store={store} template={template} onTemplateChange={setTemplate} />,
    components: <ComponentsPanel store={store} />,
    icons: <IconsPanel store={store} />,
    images: <ImagesPanel store={store} />,
    fonts: <FontsManager store={store} template={template} onTemplateChange={setTemplate} />,
  }[activeTab]

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading template…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#0d1117' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 px-3 shrink-0"
           style={{ height: 48, background: '#161b22', borderBottom: '1px solid #21262d' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          title="Dashboard"
          className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
          style={{ color: '#8b949e' }}
          onMouseEnter={e => { e.currentTarget.style.color='#f0f6fc'; e.currentTarget.style.background='#21262d' }}
          onMouseLeave={e => { e.currentTarget.style.color='#8b949e'; e.currentTarget.style.background='' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Logo dot */}
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />

        {/* Template name */}
        <input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          onBlur={saveTemplate}
          style={{
            background: 'transparent',
            color: '#f0f6fc',
            fontWeight: 500,
            fontSize: 14,
            outline: 'none',
            border: 'none',
            borderBottom: '1px solid transparent',
            padding: '2px 4px',
            minWidth: 0,
            maxWidth: 260,
          }}
          onFocus={e => { e.target.style.borderBottomColor = '#3b82f6' }}
          onBlurCapture={e => { e.target.style.borderBottomColor = 'transparent' }}
        />

        <div className="flex-1" />

        {/* Save status */}
        {saveStatus === 'saved' && (
          <span style={{ color: '#3fb950', fontSize: 12, fontWeight: 500 }}>Saved ✓</span>
        )}
        {saveStatus === 'error' && (
          <span style={{ color: '#f85149', fontSize: 12, fontWeight: 500 }}>Save failed</span>
        )}

        {/* Save button */}
        <button
          onClick={saveTemplate}
          disabled={saving}
          style={{
            fontSize: 13, fontWeight: 500,
            padding: '5px 14px',
            borderRadius: 6,
            background: saving ? '#1f6feb88' : '#1f6feb',
            color: '#fff',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#388bfd' }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#1f6feb' }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {/* Use template */}
        <button
          onClick={() => navigate(`/import/${templateId}`)}
          style={{
            fontSize: 13, fontWeight: 500,
            padding: '5px 14px',
            borderRadius: 6,
            background: '#21262d',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#30363d' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#21262d' }}
        >
          Use Template →
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left icon tab strip */}
        <div className="flex flex-col items-center py-2 gap-0.5 shrink-0"
             style={{ width: 52, background: '#161b22', borderRight: '1px solid #21262d' }}>
          {SIDEBAR_TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                style={{
                  width: 38, height: 38,
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#1f6feb22' : 'transparent',
                  color: active ? '#58a6ff' : '#8b949e',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background='#21262d'; e.currentTarget.style.color='#c9d1d9' }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#8b949e' }}}
              >
                {tab.icon}
              </button>
            )
          })}
        </div>

        {/* Left panel */}
        <div className="flex flex-col shrink-0 overflow-hidden"
             style={{ width: 256, background: '#161b22', borderRight: '1px solid #21262d' }}>
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #21262d' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {SIDEBAR_TABS.find(t => t.id === activeTab)?.label}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ padding: 8 }}>
            {activePanel}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ElementBar store={store} />
          <PolotnoContainer style={{ width: '100%', height: '100%' }}>
            <WorkspaceWrap>
              <Toolbar store={store} downloadButtonEnabled={false} />
              <Workspace store={store} />
              <ZoomButtons store={store} />
            </WorkspaceWrap>
          </PolotnoContainer>
        </div>

      </div>
    </div>
  )
}
