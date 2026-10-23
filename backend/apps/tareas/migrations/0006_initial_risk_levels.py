# Data migration to create initial risk levels

from django.db import migrations


def create_initial_risk_levels(apps, schema_editor):
    NivelRiesgo = apps.get_model('tareas', 'NivelRiesgo')
    
    risk_levels = [
        {
            'nombre': 'Riesgo Legal',
            'descripcion': 'Riesgos asociados al incumplimiento de leyes, normas y regulaciones aplicables que pueden derivar en sanciones legales o administrativas.'
        },
        {
            'nombre': 'Riesgo Contractual',
            'descripcion': 'Riesgos derivados del incumplimiento de obligaciones contractuales establecidas en acuerdos, convenios o contratos con terceros.'
        },
        {
            'nombre': 'Riesgo Laboral',
            'descripcion': 'Riesgos relacionados con el incumplimiento de normativas laborales, de seguridad y salud ocupacional que afectan a los empleados.'
        },
        {
            'nombre': 'Riesgo Financiero',
            'descripcion': 'Riesgos que pueden impactar negativamente en la situación financiera de la organización, incluyendo multas, penalidades o pérdidas económicas.'
        },
        {
            'nombre': 'Riesgo Penal',
            'descripcion': 'Riesgos asociados a la posible configuración de delitos o infracciones penales que pueden derivar en procesos judiciales y sanciones penales.'
        },
        {
            'nombre': 'Riesgo Operativo',
            'descripcion': 'Riesgos relacionados con fallas en procesos internos, sistemas, personal o eventos externos que pueden afectar la operación normal de la organización.'
        },
        {
            'nombre': 'Riesgo Reputacional',
            'descripcion': 'Riesgos asociados al deterioro de la imagen pública y la confianza de los stakeholders, que pueden resultar del incumplimiento de obligaciones o malas prácticas.'
        },
    ]
    
    for risk_data in risk_levels:
        NivelRiesgo.objects.get_or_create(
            nombre=risk_data['nombre'],
            defaults={'descripcion': risk_data['descripcion']}
        )


def reverse_risk_levels(apps, schema_editor):
    NivelRiesgo = apps.get_model('tareas', 'NivelRiesgo')
    NivelRiesgo.objects.filter(
        nombre__in=[
            'Riesgo Legal',
            'Riesgo Contractual',
            'Riesgo Laboral',
            'Riesgo Financiero',
            'Riesgo Penal',
            'Riesgo Operativo',
            'Riesgo Reputacional'
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('tareas', '0005_add_nivel_riesgo'),
    ]

    operations = [
        migrations.RunPython(create_initial_risk_levels, reverse_risk_levels),
    ]
