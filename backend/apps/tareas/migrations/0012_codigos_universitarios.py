from django.db import migrations, models

ROLES = {
    'GERENTE': 'DIRECTOR',
    'ANALISTA_COMPLIANCE': 'ANALISTA_UOC',
    'OFICIAL_COMPLIANCE': 'ADMINISTRADOR_CONTRATO',
}
ETAPAS = {
    'REVISION_GERENCIAL': 'REVISION_DIRECCION',
    'CONTROL_ANALISTA': 'CONTROL_UOC',
    'CONTROL_OFICIAL': 'CONTROL_ADMINISTRADOR',
}
ESTADOS = {
    'OBSERVADO_GERENTE': 'OBSERVADO_DIRECCION',
    'REVISION_GERENCIAL': 'REVISION_DIRECCION',
    'VALIDADO_GERENTE': 'VALIDADO_DIRECCION',
    'OBSERVADO_ANALISTA': 'OBSERVADO_UOC',
    'REVISION_ANALISTA': 'REVISION_UOC',
    'EN_PROGRESO_ANALISTA': 'EN_PROGRESO_UOC',
    'OBSERVADO_OFICIAL': 'OBSERVADO_ADMINISTRADOR',
    'PENDIENTE_VALIDACION_OFICIAL': 'PENDIENTE_VALIDACION_ADMIN',
    'REMITIDO_AUTORIDAD': 'REMITIDO_RECTORADO',
    'OBSERVADO_AUTORIDAD': 'OBSERVADO_RECTORADO',
    'APROBADO_AUTORIDAD': 'APROBADO_RECTORADO',
    'RECHAZADO_AUTORIDAD': 'RECHAZADO_RECTORADO',
}


def _aplicar(apps, roles, etapas, estados):
    Tarea = apps.get_model('tareas', 'TareaCumplimiento')
    Historial = apps.get_model('tareas', 'HistorialEstadoTarea')
    Cambio = apps.get_model('tareas', 'CambioCampoTarea')
    for v, n in etapas.items():
        Tarea.objects.filter(etapa_actual=v).update(etapa_actual=n)
        Historial.objects.filter(etapa=v).update(etapa=n)
    for v, n in estados.items():
        Tarea.objects.filter(estado_etapa=v).update(estado_etapa=n)
        Historial.objects.filter(estado_anterior=v).update(estado_anterior=n)
        Historial.objects.filter(estado_nuevo=v).update(estado_nuevo=n)
    for v, n in roles.items():
        Historial.objects.filter(rol_usuario=v).update(rol_usuario=n)
        Cambio.objects.filter(rol_usuario=v).update(rol_usuario=n)


def adelante(apps, schema_editor):
    _aplicar(apps, ROLES, ETAPAS, ESTADOS)


def atras(apps, schema_editor):
    inv = lambda d: {n: v for v, n in d.items()}
    _aplicar(apps, inv(ROLES), inv(ETAPAS), inv(ESTADOS))


class Migration(migrations.Migration):
    """Códigos de etapas, estados y roles del flujo universitario; la remisión pasa a ser al Rectorado."""

    dependencies = [
        ('tareas', '0011_flujo_universitario'),
    ]

    operations = [
        migrations.RenameField('tareacumplimiento', 'fecha_remision_autoridad', 'fecha_remision_rectorado'),
        migrations.RenameField('tareacumplimiento', 'numero_expediente_autoridad', 'numero_expediente_rectorado'),
        migrations.RenameField('tareacumplimiento', 'documento_autoridad', 'documento_rectorado'),
        migrations.AlterField(
            model_name="historialestadotarea",
            name="etapa",
            field=models.CharField(
                choices=[
                    ("INICIO", "Inicio"),
                    ("REVISION_DIRECCION", "Revisión de la Dirección"),
                    ("CONTROL_UOC", "Control de la UOC"),
                    ("CONTROL_ADMINISTRADOR", "Control del Administrador"),
                ],
                max_length=30,
                verbose_name="Etapa",
            ),
        ),
        migrations.AlterField(
            model_name="tareacumplimiento",
            name="documento_rectorado",
            field=models.FileField(
                blank=True,
                help_text="Documento oficial del Rectorado (aprobación, rechazo u observaciones)",
                null=True,
                upload_to="tareas/rectorado/",
                verbose_name="Documento del Rectorado",
            ),
        ),
        migrations.AlterField(
            model_name="tareacumplimiento",
            name="etapa_actual",
            field=models.CharField(
                choices=[
                    ("INICIO", "Inicio"),
                    ("REVISION_DIRECCION", "Revisión de la Dirección"),
                    ("CONTROL_UOC", "Control de la UOC"),
                    ("CONTROL_ADMINISTRADOR", "Control del Administrador"),
                ],
                default="INICIO",
                max_length=30,
                verbose_name="Etapa Actual",
            ),
        ),
        migrations.RunPython(adelante, atras),
    ]
