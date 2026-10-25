from django.db import migrations, models

ROLES = {
    'GERENTE': 'DIRECTOR',
    'ANALISTA_COMPLIANCE': 'ANALISTA_UOC',
    'OFICIAL_COMPLIANCE': 'ADMINISTRADOR_CONTRATO',
}


def renombrar(apps, mapa):
    Usuario = apps.get_model('authentication', 'Usuario')
    for viejo, nuevo in mapa.items():
        Usuario.objects.filter(role=viejo).update(role=nuevo)


class Migration(migrations.Migration):
    """Códigos de rol del flujo universitario (antes: Gerente / Analista y Oficial de Compliance)."""

    dependencies = [
        ('authentication', '0004_flujo_universitario'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usuario',
            name='role',
            field=models.CharField(
                choices=[
                    ('ADMINISTRADOR_CONTRATO', 'Administrador/a de Contrato'),
                    ('ANALISTA_UOC', 'Analista de Contratos (UOC)'),
                    ('DIRECTOR', 'Director/a de Dependencia'),
                    ('RESPONSABLE', 'Responsable Técnico'),
                ],
                default='RESPONSABLE',
                max_length=30,
            ),
        ),
        migrations.RunPython(
            lambda apps, se: renombrar(apps, ROLES),
            lambda apps, se: renombrar(apps, {v: k for k, v in ROLES.items()}),
        ),
    ]
