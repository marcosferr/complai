# Generated manually for file enhancements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tareas', '0002_tareacumplimiento_tags'),
    ]

    operations = [
        migrations.AddField(
            model_name='archivorespaldo',
            name='descripcion_grupo',
            field=models.CharField(blank=True, help_text='Descripción compartida para agrupar múltiples archivos', max_length=255, verbose_name='Descripción de Grupo'),
        ),
        migrations.AddField(
            model_name='archivorespaldo',
            name='tipo_mime',
            field=models.CharField(blank=True, help_text='Tipo de archivo (ej: video/mp4, application/pdf)', max_length=100, verbose_name='Tipo MIME'),
        ),
    ]
