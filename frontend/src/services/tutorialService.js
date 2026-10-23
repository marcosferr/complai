import api from './api'

const tutorialService = {
  /**
   * Get the current tutorial state for the user
   */
  getTutorialState: () => {
    return api.get('/auth/tutorial/')
  },

  /**
   * Update the tutorial state
   * @param {Object} data - { tutorial_completed?: boolean, tutorial_step?: object }
   */
  updateTutorialState: (data) => {
    return api.post('/auth/tutorial/', data)
  },

  /**
   * Reset the tutorial to start fresh
   */
  resetTutorial: () => {
    return api.post('/auth/tutorial/reset/')
  }
}

export default tutorialService
