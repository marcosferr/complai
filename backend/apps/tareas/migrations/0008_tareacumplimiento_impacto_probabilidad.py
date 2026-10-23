from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tareas', '0007_presentacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='tareacumplimiento',
            name='impacto',
            field=models.CharField(
                choices=[('BAJO', 'Bajo'), ('MEDIO', 'Medio'), ('ALTO', 'Alto')],
                default='MEDIO',
                max_length=10,
                verbose_name='Impacto en el negocio',
            ),
        ),
        migrations.AddField(
            model_name='tareacumplimiento',
            name='probabilidad',
            field=models.CharField(
                choices=[('BAJA', 'Baja'), ('MEDIA', 'Media'), ('ALTA', 'Alta')],
                default='MEDIA',
                max_length=10,
                verbose_name='Probabilidad de ocurrencia',
            ),
        ),
    ]
