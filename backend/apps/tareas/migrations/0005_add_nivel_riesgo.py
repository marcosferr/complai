# Generated manually for niveles de riesgo feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tareas', '0004_merge_20251112_2213'),
    ]

    operations = [
        migrations.CreateModel(
            name='NivelRiesgo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True, verbose_name='Nombre')),
                ('descripcion', models.TextField(blank=True, verbose_name='Descripción')),
                ('activo', models.BooleanField(default=True, verbose_name='Activo')),
                ('creado_en', models.DateTimeField(auto_now_add=True, verbose_name='Creado en')),
                ('actualizado_en', models.DateTimeField(auto_now=True, verbose_name='Actualizado en')),
            ],
            options={
                'verbose_name': 'Nivel de Riesgo',
                'verbose_name_plural': 'Niveles de Riesgo',
                'db_table': 'niveles_riesgo',
                'ordering': ['nombre'],
            },
        ),
        migrations.AddField(
            model_name='tareacumplimiento',
            name='niveles_riesgo',
            field=models.ManyToManyField(
                blank=True,
                related_name='tareas',
                to='tareas.nivelriesgo',
                verbose_name='Niveles de Riesgo'
            ),
        ),
    ]
