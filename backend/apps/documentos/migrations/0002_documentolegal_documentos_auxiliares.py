# Generated manually for auxiliary documents feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documentos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='documentolegal',
            name='documentos_auxiliares',
            field=models.ManyToManyField(
                blank=True,
                related_name='referenciado_por',
                to='documentos.documentolegal',
                verbose_name='Documentos auxiliares'
            ),
        ),
    ]
