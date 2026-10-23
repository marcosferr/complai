import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { showNotification } from '@/store/slices/uiSlice'
import auditService from '@/services/auditService'
import documentService from '@/services/documentService'
import RichTextContent from '@/components/ui/RichTextContent'

const Calendar = () => {
  const dispatch = useDispatch()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [audits, setAudits] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [auditsData, docsData] = await Promise.all([
        auditService.getAudits(),
        documentService.getDocuments()
      ])
      setAudits(auditsData.results || auditsData)
      setDocuments(docsData.results || docsData)
    } catch (error) {
      dispatch(showNotification({
        message: 'Error al cargar eventos del calendario',
        type: 'error'
      }))
    } finally {
      setLoading(false)
    }
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = []
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getEventsForDay = (date) => {
    if (!date) return []
    
    const events = []
    const dateStr = date.toISOString().split('T')[0]
    
    // Add audits
    audits.forEach(audit => {
      const auditDate = audit.fecha_programada.split('T')[0]
      if (auditDate === dateStr) {
        events.push({
          type: 'audit',
          title: audit.titulo,
          estado: audit.estado,
          data: audit
        })
      }
    })
    
    // Add document deadlines
    documents.forEach(doc => {
      if (doc.fecha_vencimiento) {
        const dueDate = doc.fecha_vencimiento.split('T')[0]
        if (dueDate === dateStr) {
          events.push({
            type: 'document',
            title: doc.titulo,
            estado: doc.estado,
            data: doc
          })
        }
      }
    })
    
    return events
  }

  const changeMonth = (delta) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const days = getDaysInMonth(currentDate)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Calendario</h1>
          <p className="text-subtle-light dark:text-subtle-dark">Seguimiento de vencimientos y auditorías programadas</p>
        </div>
        <button
          onClick={goToToday}
          title="Ir al día actual"
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-audit"></div>
          <span className="text-sm text-subtle-light dark:text-subtle-dark">Compliance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-danger"></div>
          <span className="text-sm text-subtle-light dark:text-subtle-dark">Vencimientos</span>
        </div>
      </div>
      
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark">
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => changeMonth(-1)}
            title="Ir al mes anterior"
            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
          >
            <span className="material-icons">chevron_left</span>
          </button>
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            title="Ir al mes siguiente"
            className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
          >
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
        
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          <div className="text-center text-sm font-medium text-subtle-light dark:text-subtle-dark py-2">Dom</div>
          <div className="text-center text-sm font-medium text-subtle-light dark:text-subtle-dark py-2">Lun</div>
          <div className="text-center text-sm font-medium text-subtle-light dark:text-subtle-dark py-2">Mar</div>
          <div className="text-center text-sm font-medium text-subtle-light dark:text-subtle-dark py-2">Mié</div>
          <div className="text-center text-sm font-medium text-subtle-light dark:text-subtle-dark py-2">Jue</div>
          <div className="text-center text-sm font-medium text-subtle-light dark:text-subtle-dark py-2">Vie</div>
          <div className="text-center text-sm font-medium text-subtle-light dark:text-subtle-dark py-2">Sáb</div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-subtle-light dark:text-subtle-dark">Cargando calendario...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {days.map((date, i) => {
              const events = date ? getEventsForDay(date) : []
              const isCurrentDay = isToday(date)
              
              return (
                <div
                  key={i}
                  className={`min-h-28 border rounded-lg p-2 transition-colors ${
                    date
                      ? isCurrentDay
                        ? 'bg-primary/10 border-primary dark:border-primary'
                        : 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark hover:border-primary/50'
                      : 'opacity-0'
                  }`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentDay
                          ? 'text-primary'
                          : 'text-text-light dark:text-text-dark'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {events.slice(0, 2).map((event, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedEvent(event)}
                            className={`text-xs rounded px-2 py-1 cursor-pointer truncate ${
                              event.type === 'audit'
                                ? 'bg-audit/10 text-audit hover:bg-audit/20'
                                : 'bg-danger/10 text-danger hover:bg-danger/20'
                            }`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {events.length > 2 && (
                          <div className="text-xs text-subtle-light dark:text-subtle-dark px-2">
                            +{events.length - 2} más
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-text-light dark:text-text-dark">
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-subtle-light dark:text-subtle-dark hover:text-text-light dark:hover:text-text-dark"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-icons text-primary">
                  {selectedEvent.type === 'audit' ? 'assignment' : 'description'}
                </span>
                <span className="text-sm text-subtle-light dark:text-subtle-dark">
                  {selectedEvent.type === 'audit' ? 'Auditoría' : 'Vencimiento de Documento'}
                </span>
              </div>
              
              {selectedEvent.type === 'audit' && (
                <>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark mb-1">Estado</p>
                    <span className="text-xs px-2 py-1 rounded bg-audit/10 text-audit">
                      {selectedEvent.estado === 'PROGRAMADA' ? 'Programada' :
                       selectedEvent.estado === 'EN_PROGRESO' ? 'En Progreso' :
                       selectedEvent.estado === 'COMPLETADA' ? 'Completada' : selectedEvent.estado}
                    </span>
                  </div>
                  {selectedEvent.data.descripcion && (
                    <div>
                      <p className="text-sm font-medium text-text-light dark:text-text-dark mb-1">Descripción</p>
                      <RichTextContent
                        value={selectedEvent.data.descripcion}
                        className="text-sm text-subtle-light dark:text-subtle-dark"
                      />
                    </div>
                  )}
                </>
              )}
              
              {selectedEvent.type === 'document' && (
                <>
                  <div>
                    <p className="text-sm font-medium text-text-light dark:text-text-dark mb-1">Tipo</p>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {selectedEvent.data.tipo}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar