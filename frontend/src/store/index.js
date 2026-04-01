import { create } from 'zustand'

export const useTemplateStore = create((set) => ({
  templates: [],
  currentTemplate: null,
  setTemplates: (templates) => set({ templates }),
  setCurrentTemplate: (template) => set({ currentTemplate: template }),
}))

export const useImportStore = create((set) => ({
  rows: [],
  columns: [],
  columnBindings: {},    // { placeholderColumn: excelColumn }
  assetJobId: null,      // jobId from ZIP upload
  assetIndex: {},        // { filename: serverPath }
  exportMeta: { report_title: '', prepared_by: '', date: '' },
  setRows: (rows) => set({ rows }),
  setColumns: (columns) => set({ columns }),
  setColumnBindings: (bindings) => set({ columnBindings: bindings }),
  setAssetJobId: (id) => set({ assetJobId: id }),
  setAssetIndex: (index) => set({ assetIndex: index }),
  setExportMeta: (meta) => set({ exportMeta: meta }),
  reset: () => set({ rows: [], columns: [], columnBindings: {}, assetJobId: null, assetIndex: {}, exportMeta: { report_title: '', prepared_by: '', date: '' } }),
}))

export const useExportStore = create((set) => ({
  currentJob: null,
  setCurrentJob: (job) => set({ currentJob: job }),
}))
