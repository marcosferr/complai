import json
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.documentos.models import DocumentoLegal, HistorialArchivo, Adenda as DocumentoAdenda
from apps.clausulas.models import Clausula, Adenda as ClausulaAdenda
from apps.tareas.models import TareaCumplimiento, Area
from django.conf import settings


class Command(BaseCommand):
    help = 'Import contrato.json: create Clausulas, Adendas (aplicadas) and Tareas de cumplimiento into an existing DocumentoLegal'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default='contrato.json', help='Path to contrato.json')
        parser.add_argument('--document-id', type=int, required=True, help='Existing DocumentoLegal ID to attach clauses to')
        parser.add_argument('--responsable-username', type=str, required=True, help='Username of the user to assign tareas to')
        parser.add_argument('--area-id', type=int, required=False, help='Area ID to assign tareas to (optional)')

    def handle(self, *args, **options):
        file_path = Path(options['file'])
        if not file_path.exists():
            raise CommandError(f"File not found: {file_path}")

        # Single-tenant setup - get the document directly
        try:
            documento = DocumentoLegal.objects.get(id=options['document_id'])
        except DocumentoLegal.DoesNotExist:
            raise CommandError(f"DocumentoLegal with id={options['document_id']} not found")

        # Run import
        self._import_into_documento(documento, options, file_path)

    def _import_into_documento(self, documento, options, file_path: Path):
        """Helper that imports clausulas, adendas and tareas from JSON file."""

        User = get_user_model()
        try:
            responsable = User.objects.get(username=options['responsable_username'])
        except User.DoesNotExist:
            raise CommandError(f"User not found: {options['responsable_username']}")

        # Get area for tareas - priority: command arg > user's area > default area
        area = None
        if options.get('area_id'):
            try:
                area = Area.objects.get(id=options['area_id'])
                self.stdout.write(self.style.SUCCESS(f"Using Area from --area-id: {area.nombre}"))
            except Area.DoesNotExist:
                raise CommandError(f"Area with id={options['area_id']} not found")
        elif responsable.area:
            area = responsable.area
            self.stdout.write(self.style.SUCCESS(f"Using User's Area: {area.nombre}"))
        else:
            # Create a default area if none exists
            area, created = Area.objects.get_or_create(
                nombre='Área General',
                defaults={'descripcion': 'Área creada automáticamente por importación'}
            )
            if created:
                self.stdout.write(self.style.WARNING(f"Created default Area: {area.nombre}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Using existing default Area: {area.nombre}"))

        # load JSON
        data = json.loads(file_path.read_text(encoding='utf-8'))
        clausulas = data.get('clausulas', [])

        created_counts = {'clausulas': 0, 'adendas': 0, 'tareas': 0}

        for idx, c in enumerate(clausulas, start=1):
            titulo = c.get('titulo', f'Cláusula {idx}')
            contenido = c.get('contenido', '')

            clausula = Clausula.objects.create(
                documento=documento,
                titulo=titulo,
                contenido=contenido,
                numero_orden=idx,
                creada_por=responsable
            )
            created_counts['clausulas'] += 1
            self.stdout.write(self.style.SUCCESS(f"Created Clausula id={clausula.id} titulo='{clausula.titulo}'"))

            # create adendas if present
            for a in c.get('adendas', []):
                # for each adenda in JSON we create a ClausulaAdenda linked to the clause
                adenda = ClausulaAdenda.objects.create(
                    clausula=clausula,
                    contenido_anterior=contenido,
                    contenido_nuevo=a.get('contenido', ''),
                    motivo=a.get('titulo', 'Importada desde contrato.json'),
                    fecha_creacion=timezone.now(),
                    creada_por=responsable,
                    estado='APLICADA'
                )
                created_counts['adendas'] += 1
                self.stdout.write(self.style.SUCCESS(f"Created Adenda id={adenda.id} titulo='{a.get('titulo')}' for Clausula id={clausula.id}"))

            # create tareas_cumplimiento if present
            for t in c.get('tareas_cumplimiento', []):
                titulo_t = t.get('obligacion', f'Tarea por clausula {clausula.id}')[:200]
                descripcion = t.get('obligacion', '')
                # Fechas: arranca hoy y vence en `dias_plazo` días (30 si no se indica).
                fecha_inicio = timezone.now().date()
                fecha_vencimiento = fecha_inicio + timezone.timedelta(days=int(t.get('dias_plazo', 30)))

                # Create tarea with new structure
                tarea = TareaCumplimiento.objects.create(
                    titulo=titulo_t,
                    descripcion=descripcion,
                    clausula=clausula,
                    area=area,
                    etapa_actual='INICIO',
                    estado_etapa='PENDIENTE',
                    prioridad=t.get('prioridad', 'MEDIA'),
                    fecha_vencimiento=fecha_vencimiento,
                    fecha_inicio=fecha_inicio,
                    creado_por=responsable
                )
                # Add responsable to the ManyToMany field
                tarea.responsables.add(responsable)
                
                created_counts['tareas'] += 1
                self.stdout.write(self.style.SUCCESS(f"Created Tarea id={tarea.id} titulo='{tarea.titulo}' responsables=[{responsable.username}]"))

        self.stdout.write(self.style.SUCCESS(f"Import finished. Created: {created_counts}"))
