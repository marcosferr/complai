from django.db import migrations, models

ESTADOS = {
    'REMITIDO_MOPC': 'REMITIDO_AUTORIDAD',
    'OBSERVADO_MOPC': 'OBSERVADO_AUTORIDAD',
    'APROBADO_MOPC': 'APROBADO_AUTORIDAD',
    'RECHAZADO_MOPC': 'RECHAZADO_AUTORIDAD',
}


def renombrar_estados(apps, schema_editor, mapa):
    Tarea = apps.get_model('tareas', 'TareaCumplimiento')
    Historial = apps.get_model('tareas', 'HistorialEstadoTarea')
    for viejo, nuevo in mapa.items():
        Tarea.objects.filter(estado_etapa=viejo).update(estado_etapa=nuevo)
        Historial.objects.filter(estado_anterior=viejo).update(estado_anterior=nuevo)
        Historial.objects.filter(estado_nuevo=viejo).update(estado_nuevo=nuevo)


def adelante(apps, schema_editor):
    renombrar_estados(apps, schema_editor, ESTADOS)


def atras(apps, schema_editor):
    renombrar_estados(apps, schema_editor, {v: k for k, v in ESTADOS.items()})


class Migration(migrations.Migration):
    """La etapa de remisión externa deja de ser específica de un ente (MOPC)
    y pasa a ser una «Autoridad» genérica configurable por la institución."""

    dependencies = [
        ('tareas', '0009_cambiocampotarea'),
    ]

    operations = [
        migrations.RenameField('tareacumplimiento', 'fecha_remision_mopc', 'fecha_remision_autoridad'),
        migrations.RenameField('tareacumplimiento', 'numero_expediente_mopc', 'numero_expediente_autoridad'),
        migrations.RenameField('tareacumplimiento', 'documento_mopc', 'documento_autoridad'),
        migrations.AlterField(
            model_name='tareacumplimiento',
            name='fecha_remision_autoridad',
            field=models.DateField(blank=True, null=True, verbose_name='Fecha Remisión a la Autoridad'),
        ),
        migrations.AlterField(
            model_name='tareacumplimiento',
            name='numero_expediente_autoridad',
            field=models.CharField(blank=True, max_length=100, verbose_name='Número de Expediente de la Autoridad'),
        ),
        migrations.AlterField(
            model_name='tareacumplimiento',
            name='documento_autoridad',
            field=models.FileField(
                blank=True,
                help_text='Documento oficial de la Autoridad (aprobación, rechazo u observaciones)',
                null=True,
                upload_to='tareas/autoridad/',
                verbose_name='Documento de la Autoridad',
            ),
        ),
        migrations.RunPython(adelante, atras),
    ]
