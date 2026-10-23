from apps.tareas.models import TareaCumplimiento

print("\nEstadísticas de tareas por etapa:")
print("===================================")
for etapa, label in TareaCumplimiento.ETAPA_CHOICES:
    count = TareaCumplimiento.objects.filter(etapa_actual=etapa).count()
    print(f"{label}: {count} tareas")
print("")
