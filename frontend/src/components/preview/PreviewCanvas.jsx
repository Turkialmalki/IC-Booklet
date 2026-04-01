import { useEffect, useRef } from 'react'
import { createStore } from 'polotno/model/store'
import { PolotnoContainer, WorkspaceWrap } from 'polotno/polotno-app'
import { Workspace } from 'polotno/canvas/workspace'
import { mergePageData } from '../../utils/merger.js'
import { resolveImageClient } from '../../utils/resolver.js'
import { useImportStore } from '../../store/index.js'

const previewStore = createStore({ key: 'nFA5H9elEytDyPyvKL7T', showCredit: false })
previewStore.setSize(1920, 1080)

const VALID_TYPES = new Set(['text', 'image', 'svg', 'figure', 'video'])

export default function PreviewCanvas({ pageJson, rowData, bindings, columnBindings }) {
  const lastKeyRef = useRef(null)
  const { assetIndex } = useImportStore()

  useEffect(() => {
    if (!pageJson) return
    const merged = mergePageData(pageJson, rowData || {}, bindings || {}, columnBindings || {})
    // Resolve image src values through the asset index so filenames from the CSV
    // (and /storage/ server paths from the editor) display correctly in the preview.
    for (const el of merged.children || []) {
      if (el.type === 'image' && el.src) {
        el.src = resolveImageClient(el.src, assetIndex)
      }
    }
    const key = JSON.stringify({ pageJson, rowData, bindings, columnBindings, assetIndex })
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key

    const w = parseInt(merged.width, 10) || 1920
    const h = parseInt(merged.height, 10) || 1080

    // Use loadJSON for an atomic MST snapshot replacement.
    // Calling clear() + addPage() + addElement() individually can leave
    // dead MST nodes while React observer components are still mounted,
    // causing "Failed to find the parent of ... [dead]" errors.
    previewStore.loadJSON({
      width: w,
      height: h,
      pages: [{
        id: 'preview_page',
        background: merged.background || 'white',
        children: (merged.children || []).filter(el => VALID_TYPES.has(el.type)),
      }],
    })
  }, [pageJson, rowData, bindings, columnBindings, assetIndex])

  if (!pageJson) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <p className="text-gray-400 text-sm">No page to preview</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-lg">
      {/* Block editing interactions */}
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }} />
      <PolotnoContainer style={{ width: '100%', height: '100%' }}>
        <WorkspaceWrap>
          <Workspace
            store={previewStore}
            components={{ Toolbar: () => null }}
          />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  )
}
