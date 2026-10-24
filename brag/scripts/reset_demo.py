from datetime import timedelta
from django.utils import timezone
from apps.tareas.models import TareaCumplimiento as T, HistorialEstadoTarea as H
from apps.notificaciones.models import Notificacion
hoy = timezone.now().date()
off = {'acta de inicio': -4, 'póliza de garantía': -1, 'inventario inicial': 3, 'tiempos de respuesta': 5,
       'informe técnico mensual': 6, 'documentación de pago': 12, 'informe de conformidad': 14,
       'Calcular multas': 20, 'por muestreo': 25, 'Controlar la vigencia': 60, 'informe final': 365}
for sub, d in off.items():
    t = T.objects.get(titulo__icontains=sub)
    T.objects.filter(pk=t.pk).update(fecha_vencimiento=hoy + timedelta(days=d), fecha_inicio=hoy - timedelta(days=10))
inv = T.objects.get(titulo__icontains='inventario inicial')
T.objects.filter(pk=inv.pk).update(etapa_actual='INICIO', estado_etapa='EN_PROGRESO')
H.objects.filter(tarea=inv).delete()
keep = ['Obligación vencida: póliza de garantía', 'Vence en 3 días: inventario inicial', 'Nuevo informe técnico cargado', 'Acta de inicio requiere atención']
Notificacion.objects.exclude(titulo__in=keep).delete()
Notificacion.objects.update(leida=False)
print(hoy, [(t.titulo[:25], t.dias_restantes, t.etapa_actual) for t in T.objects.order_by('fecha_vencimiento')])
