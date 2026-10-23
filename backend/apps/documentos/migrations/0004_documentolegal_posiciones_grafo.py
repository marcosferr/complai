from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documentos', '0003_merge_20251126_0909'),
    ]

    operations = [
        migrations.AddField(
            model_name='documentolegal',
            name='posiciones_grafo',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
