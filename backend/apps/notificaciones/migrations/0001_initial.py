# Generated manually for notificaciones app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tareas', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notificacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('TAREA_ASIGNADA', 'Tarea Asignada'), ('TAREA_VENCIMIENTO', 'Tarea Próxima a Vencer'), ('CAMBIO_ESTADO', 'Cambio de Estado'), ('CAMBIO_ETAPA', 'Cambio de Etapa'), ('COMENTARIO', 'Nuevo Comentario'), ('GENERAL', 'General')], default='GENERAL', max_length=30, verbose_name='Tipo')),
                ('titulo', models.CharField(max_length=200, verbose_name='Título')),
                ('mensaje', models.TextField(verbose_name='Mensaje')),
                ('leida', models.BooleanField(default=False, verbose_name='Leída')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Información adicional sobre la notificación', verbose_name='Metadatos')),
                ('tarea', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones', to='tareas.tareacumplimiento', verbose_name='Tarea relacionada')),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones', to=settings.AUTH_USER_MODEL, verbose_name='Usuario')),
            ],
            options={
                'verbose_name': 'Notificación',
                'verbose_name_plural': 'Notificaciones',
                'db_table': 'notificaciones',
                'ordering': ['-fecha_creacion'],
            },
        ),
        migrations.AddIndex(
            model_name='notificacion',
            index=models.Index(fields=['usuario', 'leida'], name='notificacio_usuario_5e5e5e_idx'),
        ),
        migrations.AddIndex(
            model_name='notificacion',
            index=models.Index(fields=['usuario', 'fecha_creacion'], name='notificacio_usuario_2f2f2f_idx'),
        ),
        migrations.AddIndex(
            model_name='notificacion',
            index=models.Index(fields=['tipo'], name='notificacio_tipo_3a3a3a_idx'),
        ),
    ]
