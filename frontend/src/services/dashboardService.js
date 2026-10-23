import api from './api'

const dashboardService = {
  // Obtener estadísticas del dashboard
  getStats: () => {
    return api.get('/dashboard/stats/')
  }
}

export default dashboardService
