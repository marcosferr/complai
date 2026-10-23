# Generated manually for notification type update

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notificaciones', '0002_add_notificacion_configuracion'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notificacion',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('TAREA_ASIGNADA', 'Tarea Asignada'),
                    ('TAREA_VENCIMIENTO', 'Tarea Próxima a Vencer'),
                    ('CAMBIO_ESTADO', 'Cambio de Estado'),
                    ('CAMBIO_ETAPA', 'Cambio de Etapa'),
                    ('COMENTARIO', 'Nuevo Comentario'),
                    ('ARCHIVO_SUBIDO', 'Archivo Subido'),
                    ('GENERAL', 'General'),
                ],
                default='GENERAL',
                max_length=30,
                verbose_name='Tipo'
            ),
        ),
    ]
