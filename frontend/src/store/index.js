import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import documentosSlice from './slices/documentosSlice'
import clausulasSlice from './slices/clausulasSlice'
import tareasSlice from './slices/tareasSlice'
import auditoriasSlice from './slices/auditoriasSlice'
import calendarioSlice from './slices/calendarioSlice'
import notificacionesSlice from './slices/notificacionesSlice'
import uiSlice from './slices/uiSlice'
import usersSlice from './slices/usersSlice'
import dashboardSlice from './slices/dashboardSlice'
import tutorialSlice from './slices/tutorialSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    documentos: documentosSlice,
    clausulas: clausulasSlice,
    tareas: tareasSlice,
    auditorias: auditoriasSlice,
    calendario: calendarioSlice,
    notificaciones: notificacionesSlice,
    ui: uiSlice,
    users: usersSlice,
    dashboard: dashboardSlice,
    tutorial: tutorialSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})