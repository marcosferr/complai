import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // Whether to show the sidebar tutorial
  runSidebarTutorial: false,
  // Whether to show the documents tutorial  
  runDocumentosTutorial: false,
  // Current step index for each tutorial
  sidebarStepIndex: 0,
  documentosStepIndex: 0,
  // Tutorial completion status from backend
  tutorialCompleted: false,
  // Tutorial step progress from backend
  tutorialStep: {},
  // Loading state
  loading: false,
  error: null
}

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    // Start the sidebar tutorial
    startSidebarTutorial: (state) => {
      state.runSidebarTutorial = true
      state.sidebarStepIndex = 0
    },
    // Stop the sidebar tutorial
    stopSidebarTutorial: (state) => {
      state.runSidebarTutorial = false
    },
    // Start the documentos tutorial
    startDocumentosTutorial: (state) => {
      state.runDocumentosTutorial = true
      state.documentosStepIndex = 0
    },
    // Stop the documentos tutorial
    stopDocumentosTutorial: (state) => {
      state.runDocumentosTutorial = false
    },
    // Update step index for sidebar tutorial
    setSidebarStepIndex: (state, action) => {
      state.sidebarStepIndex = action.payload
    },
    // Update step index for documentos tutorial
    setDocumentosStepIndex: (state, action) => {
      state.documentosStepIndex = action.payload
    },
    // Set tutorial state from backend
    setTutorialState: (state, action) => {
      state.tutorialCompleted = action.payload.tutorial_completed
      state.tutorialStep = action.payload.tutorial_step || {}
    },
    // Mark a section as completed
    markSectionCompleted: (state, action) => {
      const section = action.payload
      state.tutorialStep = {
        ...state.tutorialStep,
        [section]: true
      }
    },
    // Reset tutorial state
    resetTutorialState: (state) => {
      state.tutorialCompleted = false
      state.tutorialStep = {}
      state.runSidebarTutorial = false
      state.runDocumentosTutorial = false
      state.sidebarStepIndex = 0
      state.documentosStepIndex = 0
    },
    // Set loading
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    // Set error
    setError: (state, action) => {
      state.error = action.payload
    }
  }
})

export const {
  startSidebarTutorial,
  stopSidebarTutorial,
  startDocumentosTutorial,
  stopDocumentosTutorial,
  setSidebarStepIndex,
  setDocumentosStepIndex,
  setTutorialState,
  markSectionCompleted,
  resetTutorialState,
  setLoading,
  setError
} = tutorialSlice.actions

export default tutorialSlice.reducer
