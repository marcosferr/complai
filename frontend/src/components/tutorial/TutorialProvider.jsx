import React, { useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride'
import {
  stopSidebarTutorial,
  stopDocumentosTutorial,
  setSidebarStepIndex,
  setDocumentosStepIndex,
  setTutorialState,
  markSectionCompleted
} from '@/store/slices/tutorialSlice'
import { getSidebarSteps, documentosTutorialSteps } from './tutorialSteps'
import tutorialService from '@/services/tutorialService'

/**
 * Tutorial Provider Component
 * Provides guided tutorials for the platform based on user role
 */
const TutorialProvider = ({ children }) => {
  const dispatch = useDispatch()
  const { user } = useSelector(state => state.auth)
  const {
    runSidebarTutorial,
    runDocumentosTutorial,
    sidebarStepIndex,
    documentosStepIndex
  } = useSelector(state => state.tutorial)

  // Get sidebar steps based on user role
  const sidebarSteps = user?.role ? getSidebarSteps(user.role) : []

  // Load tutorial state on mount
  useEffect(() => {
    const loadTutorialState = async () => {
      if (user) {
        try {
          const response = await tutorialService.getTutorialState()
          dispatch(setTutorialState(response.data))
        } catch (error) {
          console.error('Error loading tutorial state:', error)
        }
      }
    }
    loadTutorialState()
  }, [user, dispatch])

  // Save tutorial progress to backend
  const saveTutorialProgress = useCallback(async (section, completed = false) => {
    try {
      await tutorialService.updateTutorialState({
        tutorial_step: { [section]: true },
        tutorial_completed: completed
      })
      dispatch(markSectionCompleted(section))
    } catch (error) {
      console.error('Error saving tutorial progress:', error)
    }
  }, [dispatch])

  // Handle sidebar tutorial callback
  const handleSidebarJoyrideCallback = useCallback((data) => {
    const { action, index, status, type } = data

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // Update step index based on action type
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1
      dispatch(setSidebarStepIndex(Math.max(0, nextIndex)))
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Tutorial finished or skipped
      dispatch(stopSidebarTutorial())
      saveTutorialProgress('sidebar', false)
    }
  }, [dispatch, saveTutorialProgress])

  // Handle documentos tutorial callback
  const handleDocumentosJoyrideCallback = useCallback((data) => {
    const { action, index, status, type } = data

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // Update step index based on action type
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1
      dispatch(setDocumentosStepIndex(Math.max(0, nextIndex)))
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Tutorial finished or skipped - mark tutorial as complete if documentos is done
      dispatch(stopDocumentosTutorial())
      saveTutorialProgress('documentos', true)
    }
  }, [dispatch, saveTutorialProgress])

  // Common Joyride styles matching the project theme
  const joyrideStyles = {
    options: {
      arrowColor: '#ffffff',
      backgroundColor: '#ffffff',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      primaryColor: '#AE152D', // Bordó institucional UNI
      spotlightShadow: '0 0 15px rgba(0, 120, 63, 0.5)',
      textColor: '#1f2937',
      width: 380,
      zIndex: 10000,
    },
    buttonNext: {
      backgroundColor: '#AE152D',
      borderRadius: '8px',
      color: '#ffffff',
      fontSize: '14px',
      padding: '8px 16px',
    },
    buttonBack: {
      color: '#6b7280',
      fontSize: '14px',
      marginRight: 8,
    },
    buttonSkip: {
      color: '#6b7280',
      fontSize: '13px',
    },
    buttonClose: {
      color: '#9ca3af',
    },
    tooltip: {
      borderRadius: '12px',
      padding: '20px',
    },
    tooltipTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '8px',
    },
    tooltipContent: {
      fontSize: '14px',
      lineHeight: '1.6',
    },
    spotlight: {
      borderRadius: '8px',
    },
  }

  // Localized strings for Spanish
  const locale = {
    back: 'Anterior',
    close: 'Cerrar',
    last: 'Finalizar',
    next: 'Siguiente',
    nextLabelWithProgress: 'Siguiente (Paso {step} de {steps})',
    open: 'Abrir',
    skip: 'Saltar tutorial',
  }

  return (
    <>
      {children}
      
      {/* Sidebar Tutorial */}
      <Joyride
        callback={handleSidebarJoyrideCallback}
        continuous
        hideCloseButton={false}
        run={runSidebarTutorial}
        scrollToFirstStep
        showProgress
        showSkipButton
        stepIndex={sidebarStepIndex}
        steps={sidebarSteps}
        styles={joyrideStyles}
        locale={locale}
        disableOverlayClose
        spotlightClicks
      />

      {/* Documentos Tutorial */}
      <Joyride
        callback={handleDocumentosJoyrideCallback}
        continuous
        hideCloseButton={false}
        run={runDocumentosTutorial}
        scrollToFirstStep
        showProgress
        showSkipButton
        stepIndex={documentosStepIndex}
        steps={documentosTutorialSteps}
        styles={joyrideStyles}
        locale={locale}
        disableOverlayClose
        spotlightClicks
      />
    </>
  )
}

export default TutorialProvider
