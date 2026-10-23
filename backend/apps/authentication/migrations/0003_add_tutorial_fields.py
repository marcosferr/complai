# Generated migration for tutorial fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='tutorial_completed',
            field=models.BooleanField(
                default=False,
                help_text='Indica si el usuario ha completado el tutorial guiado',
                verbose_name='Tutorial Completado'
            ),
        ),
        migrations.AddField(
            model_name='usuario',
            name='tutorial_step',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Almacena el estado de progreso de cada sección del tutorial',
                verbose_name='Progreso del Tutorial'
            ),
        ),
    ]
