"""
Management command to migrate task states to new naming convention
"""
from django.core.management.base import BaseCommand
from apps.tareas.models import TareaCumplimiento


class Command(BaseCommand):
    help = 'Migrar estados de tareas al nuevo esquema de nombres'

    def handle(self, *args, **options):
        # Mapeo de estados antiguos a nuevos
        mapeo_estados = {
            # Etapa REVISION_DIRECCION
            'DEVUELTO_OBSERVACIONES': 'OBSERVADO_DIRECCION',  # Este ya no existe en esta etapa
            'VALIDACION_GERENCIAL': 'VALIDADO_DIRECCION',
            
            # Etapa CONTROL_UOC
            'A_VALIDAR_OFICIAL': 'PENDIENTE_VALIDACION_ADMIN',
            'VALIDADA_ANALISTA': 'PENDIENTE_VALIDACION_ADMIN',
            
            # Etapa CONTROL_ADMINISTRADOR
            'VALIDADA': 'PENDIENTE_VALIDACION',  # Solo si está en CONTROL_ADMINISTRADOR y es el primer estado
        }
        
        total_actualizadas = 0
        
        for tarea in TareaCumplimiento.objects.all():
            estado_anterior = tarea.estado_etapa
            actualizado = False
            
            # Aplicar mapeo según etapa
            if tarea.etapa_actual == 'REVISION_DIRECCION':
                if tarea.estado_etapa == 'VALIDACION_GERENCIAL':
                    tarea.estado_etapa = 'VALIDADO_DIRECCION'
                    actualizado = True
                # DEVUELTO_OBSERVACIONES ya no es válido en esta etapa
                elif tarea.estado_etapa == 'DEVUELTO_OBSERVACIONES':
                    # Mover a INICIO con OBSERVADO_DIRECCION
                    tarea.etapa_actual = 'INICIO'
                    tarea.estado_etapa = 'OBSERVADO_DIRECCION'
                    actualizado = True
                    
            elif tarea.etapa_actual == 'CONTROL_UOC':
                if tarea.estado_etapa in ['A_VALIDAR_OFICIAL', 'VALIDADA_ANALISTA']:
                    tarea.estado_etapa = 'PENDIENTE_VALIDACION_ADMIN'
                    actualizado = True
                    
            elif tarea.etapa_actual == 'CONTROL_ADMINISTRADOR':
                # Las tareas en CONTROL_ADMINISTRADOR con VALIDADA pasan a PENDIENTE_VALIDACION
                if tarea.estado_etapa == 'VALIDADA':
                    tarea.estado_etapa = 'PENDIENTE_VALIDACION'
                    actualizado = True
            
            if actualizado:
                tarea.save()
                total_actualizadas += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Tarea {tarea.id}: {estado_anterior} -> {tarea.estado_etapa} (Etapa: {tarea.etapa_actual})'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Migración completada. {total_actualizadas} tareas actualizadas.'
            )
        )
