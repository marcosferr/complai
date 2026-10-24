"""Datos de demo v2: contrato de obra derivado de un dictamen anonimizado de modificación contractual.
Se ejecuta con: python manage.py shell < brag/scripts/seed_obra.py  (requiere los usuarios de seed.py)."""
from datetime import timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
from apps.authentication.models import Usuario
from apps.documentos.models import DocumentoLegal
from apps.clausulas.models import Clausula
from apps.tareas.models import TareaCumplimiento as T, Area, NivelRiesgo, ArchivoRespaldo, ComentarioTarea, ChecklistItem, HistorialEstadoTarea
from apps.notificaciones.models import Notificacion

Notificacion.objects.all().delete()
T.objects.all().delete()
DocumentoLegal.objects.all().delete()

hoy = timezone.now().date()
oficial = Usuario.objects.get(username='admin.contratos')
resp = Usuario.objects.get(username='resp.infra')
area = Area.objects.get(nombre='Dirección de Infraestructura')

doc = DocumentoLegal.objects.create(
    titulo='Contrato de Obra LPN – Unidad Académica', tipo='CONTRATO', estado='ACTIVO', creado_por=oficial,
    fecha_vencimiento=hoy + timedelta(days=60), estado_procesamiento_ia='COMPLETADO',
    etiquetas=['Obra pública', 'LPN', 'Obra gris', 'Convenio modificatorio', 'Ley 7021/2022'],
    resumen_ia='Contrato de obra (LPN) con plazo original de 257 días calendario. Solicitud de convenio modificatorio de monto y plazo: '
               '7 rubros nuevos y ampliación de 20 días, con tope del 20 % (Ley 7021/2022, art. 67).')
doc.archivo.save('contrato_obra_lpn.pdf', ContentFile(b'%PDF-1.4\n% demo\n'), save=True)

CL = [
    ('Objeto y alcance de la obra', 'Ejecución de obras en la Unidad Académica, actualmente en la etapa de Obra Gris: mamposterías, cubiertas e instalaciones ocultas (electricidad y plomería).'),
    ('Plazo de ejecución', 'El plazo original de ejecución es de 257 días calendario, contados desde la fecha de inicio.'),
    ('Fiscalización de obra', 'La Fiscal de Obras realiza el seguimiento de los trabajos en ejecución y emite los informes técnicos correspondientes.'),
    ('Modificaciones contractuales', 'Ley 7021/2022, art. 67: las modificaciones deberán formalizarse por escrito, previa autorización por acto administrativo basado en un dictamen fundado del administrador de contrato, y ser suscritas por la máxima autoridad. No podrán exceder el 20 % del monto y plazo originalmente pactados. Queda prohibido modificar contratos vencidos.'),
    ('Rubros nuevos del convenio modificatorio', 'Reparación de rajaduras, mamposterías, revoques, refuerzo de la estructura metálica del techo, tablero eléctrico con acometida y llave de corte, y pre instalación de aires acondicionados.'),
    ('Ampliación de plazo', 'Se recomienda ampliar el plazo en 20 (veinte) días calendario, sin superar el límite del 20 % del plazo originalmente pactado.'),
]
cls = [Clausula.objects.create(documento=doc, titulo=f'Cláusula {i} - {t}', contenido=c, numero_orden=i, creada_por=oficial) for i, (t, c) in enumerate(CL, 1)]
R = {n.nombre: n for n in NivelRiesgo.objects.all()}

def tarea(cl, titulo, dias, etapa='INICIO', estado='PENDIENTE', prio='MEDIA', imp='MEDIO', prob='MEDIA', riesgos=()):
    t = T.objects.create(titulo=titulo, descripcion=titulo, clausula=cls[cl - 1], area=area, etapa_actual=etapa,
                         estado_etapa=estado, prioridad=prio, impacto=imp, probabilidad=prob,
                         fecha_inicio=hoy - timedelta(days=10), fecha_vencimiento=hoy + timedelta(days=dias), creado_por=oficial)
    t.responsables.add(resp)
    t.niveles_riesgo.set([R[r] for r in riesgos if r in R])
    return t

tarea(1, 'Supervisar la etapa de obra gris: mamposterías, cubiertas e instalaciones ocultas', 45, prio='MEDIA', riesgos=['Riesgo Operativo'])
tarea(2, 'Controlar el plazo de ejecución de 257 días calendario', 60, prio='ALTA', imp='ALTO', prob='BAJA', riesgos=['Riesgo Contractual'])
fiscal = tarea(3, 'Recibir y revisar el informe de seguimiento de la Fiscal de Obras', 6, 'REVISION_GERENCIAL', 'REVISION_GERENCIAL', riesgos=['Riesgo Operativo'])
tarea(4, 'Emitir el dictamen fundado del administrador sobre la modificación', 30, 'CONTROL_OFICIAL', 'VALIDADA', prio='ALTA', riesgos=['Riesgo Legal'])
tarea(4, 'Verificar que la ampliación no supere el 20 % del monto y plazo', 5, estado='EN_PROGRESO', prio='ALTA', imp='ALTO', riesgos=['Riesgo Legal', 'Riesgo Financiero'])
firma = tarea(4, 'Gestionar la firma del convenio modificatorio por la máxima autoridad', -4, estado='REQUIERE_ATENCION', prio='CRITICA', imp='ALTO', prob='ALTA', riesgos=['Riesgo Contractual'])
docu = tarea(4, 'Reunir la documentación del convenio modificatorio', 12, prio='MEDIA', imp='MEDIO', prob='BAJA', riesgos=['Riesgo Legal'])
tarea(5, 'Reparar rajaduras en mampostería con envarillado (127 ml)', 25)
tarea(5, 'Ejecutar mamposterías nuevas: 25 m² macizada y 26,54 m² de ladrillo hueco', 25)
techo = tarea(5, 'Reforzar la estructura metálica del techo', 3, estado='EN_PROGRESO', prio='ALTA', imp='ALTO', riesgos=['Riesgo Operativo'])
tarea(5, 'Instalar tablero eléctrico con acometida y llave de corte', 14, prio='ALTA', riesgos=['Riesgo Operativo'])
tarea(5, 'Pre instalación para equipos de aire acondicionado', 20, prio='BAJA', imp='BAJO')
tarea(6, 'Actualizar el cronograma con la ampliación de 20 días calendario', -2, prio='ALTA', riesgos=['Riesgo Contractual'])

ComentarioTarea.objects.create(tarea=firma, usuario=oficial, texto='Falta la firma de la máxima autoridad. Sin convenio firmado no puede ejecutarse la ampliación.')
for i, (titulo, ok) in enumerate([('Solicitud del contratista', True), ('Dictamen técnico del administrador', True),
                                  ('Planos del esquema eléctrico', False), ('Acto administrativo de autorización', False)]):
    ChecklistItem.objects.create(tarea=docu, titulo=titulo, completado=ok, orden=i)
a = ArchivoRespaldo(tarea=fiscal, nombre_original='informe_fiscal_obra_gris.pdf', descripcion='Informe de seguimiento de la Fiscal de Obras', subido_por=resp, tipo_mime='application/pdf', tamanio=512340)
a.archivo.save('informe_fiscal_obra_gris.pdf', ContentFile(b'%PDF-1.4\n% demo\n'), save=True)

Notificacion.objects.all().delete()
for tipo, titulo, msg, t in [
    ('TAREA_VENCIMIENTO', 'Firma del convenio: vencida hace 4 días', 'Falta la firma de la máxima autoridad para formalizar el convenio modificatorio.', firma),
    ('TAREA_VENCIMIENTO', 'Vence en 3 días: refuerzo del techo', 'Refuerzo de la estructura metálica del techo, rubro nuevo del convenio.', techo),
    ('ARCHIVO_SUBIDO', 'Nuevo informe de la Fiscal de Obras', 'Diego Ramírez subió informe_fiscal_obra_gris.pdf', fiscal),
    ('CAMBIO_ESTADO', 'Ampliación: verificar el tope del 20 %', 'La ampliación de monto y plazo no puede superar el 20 % de lo pactado.', docu),
]:
    Notificacion.objects.create(usuario=oficial, tipo=tipo, titulo=titulo, mensaje=msg, tarea=t)
from apps.authentication.models import Usuario as U
U.objects.update(tutorial_completed=True)
print('OK', doc.id, T.objects.count(), [(t.titulo[:30], t.dias_restantes) for t in T.objects.order_by('fecha_vencimiento')])
