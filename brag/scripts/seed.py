from datetime import timedelta
from django.utils import timezone
from django.core.management import call_command
from django.core.files.base import ContentFile
from apps.authentication.models import Usuario
from apps.documentos.models import DocumentoLegal
from apps.tareas.models import TareaCumplimiento as T, Area, NivelRiesgo, ArchivoRespaldo, ComentarioTarea
from apps.notificaciones.models import Notificacion

hoy = timezone.now().date()
area, _ = Area.objects.get_or_create(nombre='Dirección de Infraestructura', defaults={'descripcion': 'Mantenimiento y obras'})

def usuario(username, first, last, role, area=None):
    u = Usuario(username=username, email=f'{username}@ejemplo.edu.py', first_name=first, last_name=last, role=role, area=area)
    u.set_password('Demo-UNI-2026!'); u.save(skip_validation=True); return u

oficial = usuario('admin.contratos', 'Laura', 'Benítez', 'OFICIAL_COMPLIANCE')
resp = usuario('resp.infra', 'Diego', 'Ramírez', 'RESPONSABLE', area)
usuario('jefa.infra', 'Ana', 'Giménez', 'GERENTE', area)

doc = DocumentoLegal.objects.create(
    titulo='Contrato de Mantenimiento de Climatización 2026',
    tipo='CONTRATO', estado='ACTIVO',
    creado_por=oficial,
    fecha_vencimiento=hoy + timedelta(days=365),
    resumen_ia=('Contrato de 12 meses para el mantenimiento preventivo y correctivo de equipos de '
                'climatización de la Sede Central y Facultades. Obligaciones clave: garantía de fiel '
                'cumplimiento del 5% en 10 días, informe técnico mensual, respuesta en 24 h para aulas '
                'y laboratorios, documentación tributaria e IPS para cada pago. Multa de 0,5% diario por atraso.'),
    estado_procesamiento_ia='COMPLETADO',
)
doc.archivo.save('contrato_climatizacion_2026.pdf', ContentFile(b'%PDF-1.4\n% demo\n'), save=True)
call_command('import_contrato', file='demo/contrato_uni_ejemplo.json', document_id=doc.id,
             responsable_username='resp.infra', area_id=area.id)

def t(sub):
    return T.objects.get(titulo__icontains=sub)

riesgos = {n.nombre: n for n in NivelRiesgo.objects.all()}
ajustes = [
    # sub, dias de vencimiento relativo a hoy, etapa, estado, prioridad, impacto, prob, riesgos
    ('acta de inicio', -4, 'INICIO', 'REQUIERE_ATENCION', 'CRITICA', 'ALTO', 'ALTA', ['Riesgo Contractual']),
    ('póliza de garantía', -1, 'INICIO', 'PENDIENTE', 'CRITICA', 'ALTO', 'ALTA', ['Riesgo Financiero', 'Riesgo Contractual']),
    ('inventario inicial', 3, 'INICIO', 'EN_PROGRESO', 'ALTA', 'MEDIO', 'MEDIA', ['Riesgo Operativo']),
    ('tiempos de respuesta', 5, 'INICIO', 'EN_PROGRESO', 'ALTA', 'ALTO', 'MEDIA', ['Riesgo Operativo']),
    ('informe técnico mensual', 6, 'REVISION_GERENCIAL', 'REVISION_GERENCIAL', 'MEDIA', 'MEDIO', 'MEDIA', ['Riesgo Operativo']),
    ('documentación de pago', 12, 'INICIO', 'PENDIENTE', 'MEDIA', 'MEDIO', 'BAJA', ['Riesgo Financiero']),
    ('informe de conformidad', 14, 'CONTROL_ANALISTA', 'REVISION_ANALISTA', 'ALTA', 'MEDIO', 'BAJA', ['Riesgo Legal']),
    ('Calcular multas', 20, 'INICIO', 'PENDIENTE', 'MEDIA', 'MEDIO', 'MEDIA', ['Riesgo Legal']),
    ('por muestreo', 25, 'INICIO', 'PENDIENTE', 'MEDIA', 'BAJO', 'MEDIA', []),
    ('Controlar la vigencia', 60, 'CONTROL_OFICIAL', 'VALIDADA', 'ALTA', 'ALTO', 'BAJA', ['Riesgo Financiero']),
]
etapas = [c[0] for c in T.ETAPA_CHOICES]
for sub, dias, etapa, estado, prio, imp, prob, rs in ajustes:
    x = t(sub)
    x.fecha_vencimiento = hoy + timedelta(days=dias)
    x.fecha_inicio = hoy - timedelta(days=10)
    if etapa in etapas: x.etapa_actual = etapa
    x.estado_etapa = estado
    x.prioridad = prio; x.impacto = imp; x.probabilidad = prob
    x.save()
    x.niveles_riesgo.set([riesgos[r] for r in rs if r in riesgos])

g = t('póliza de garantía')
ComentarioTarea.objects.create(tarea=g, usuario=oficial, texto='El proveedor aún no presentó la póliza. Se envió nota de reclamo; plazo vencido ayer.')
inf = t('informe técnico mensual')
a = ArchivoRespaldo(tarea=inf, nombre_original='informe_mantenimiento_septiembre.pdf', descripcion='Informe técnico de septiembre firmado', subido_por=resp, tipo_mime='application/pdf', tamanio=482133)
a.archivo.save('informe_mantenimiento_septiembre.pdf', ContentFile(b'%PDF-1.4\n% demo\n'), save=True)

for tipo, titulo, msg, tarea in [
    ('TAREA_VENCIMIENTO', 'Obligación vencida: póliza de garantía', 'Venció ayer el plazo para verificar la póliza de garantía de fiel cumplimiento (5%).', g),
    ('TAREA_VENCIMIENTO', 'Vence en 3 días: inventario inicial', 'El proveedor debe presentar el inventario de equipos por sede.', t('inventario inicial')),
    ('ARCHIVO_SUBIDO', 'Nuevo informe técnico cargado', 'Diego Ramírez subió informe_mantenimiento_septiembre.pdf', inf),
    ('CAMBIO_ESTADO', 'Acta de inicio requiere atención', 'La firma del acta de inicio está atrasada 4 días.', t('acta de inicio')),
]:
    Notificacion.objects.create(usuario=oficial, tipo=tipo, titulo=titulo, mensaje=msg, tarea=tarea)
print('OK', doc.id, T.objects.count())
