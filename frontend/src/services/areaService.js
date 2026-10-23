import api from './api'

const areaService = {
  // Get all areas
  getAreas: () => {
    return api.get('/tareas/areas/')
  },

  // Create new area
  createArea: (areaData) => {
    return api.post('/tareas/areas/', areaData)
  }
}

export default areaService
