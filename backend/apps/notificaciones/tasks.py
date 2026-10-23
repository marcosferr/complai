"""
Celery tasks for notifications
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone

from .services import NotificationService

logger = logging.getLogger(__name__)


@shared_task(name='notificaciones.check_scheduled_notifications')
def check_scheduled_notifications():
    """
    Check and send scheduled notifications based on NotificacionConfiguracion
    Runs daily at 9:00 AM UTC-3
    """
    logger.info("Starting scheduled notifications check")
    
    try:
        from apps.tareas.models import TareaCumplimiento
        from .models import NotificacionConfiguracion
        
        today = timezone.now().date()
        
        # Get all active notification configs
        configs = NotificacionConfiguracion.objects.filter(
            habilitada=True,
            tarea__fecha_vencimiento__isnull=False
        ).select_related('tarea', 'tarea__area', 'tarea__creado_por', 'tarea__clausula').prefetch_related('tarea__responsables')
        
        # Exclude completed tasks
        estados_completados = ['VALIDADA', 'APROBADO_AUTORIDAD']
        configs = configs.exclude(tarea__estado_etapa__in=estados_completados)
        
        notifications_sent = 0
        configs_processed = 0
        
        for config in configs:
            tarea = config.tarea
            fecha_vencimiento = tarea.fecha_vencimiento
            
            # Check each interval
            # Ensure intervalos_dias is not None and is iterable
            intervalos = config.intervalos_dias
            if intervalos is None or not isinstance(intervalos, (list, tuple)):
                logger.warning(f"Config {config.id} for task {tarea.id} has invalid intervalos_dias: {intervalos}")
                continue

            for intervalo in intervalos:
                try:
                    # Robust check if intervalo is a valid integer (it might be a string in JSON)
                    dias = int(intervalo)
                except (ValueError, TypeError):
                    logger.warning(f"Invalid interval value '{intervalo}' in config {config.id}")
                    continue

                fecha_notificacion = fecha_vencimiento - timedelta(days=dias)
                
                # Check if we should send notification today
                if fecha_notificacion == today:
                    # Check if already sent
                    if str(intervalo) not in config.notificaciones_enviadas:
                        # Send notification to all relevant users
                        usuarios_notificar = []
                        
                        # Add responsables
                        usuarios_notificar.extend(tarea.responsables.filter(is_active=True))
                        
                        # Add gerente if area exists
                        if tarea.area:
                            from apps.authentication.models import Usuario
                            gerentes = Usuario.objects.filter(
                                role='GERENTE',
                                area=tarea.area,
                                is_active=True
                            )
                            usuarios_notificar.extend(gerentes)
                        
                        # Add analistas and oficiales
                        from apps.authentication.models import Usuario
                        analistas_oficiales = Usuario.objects.filter(
                            role__in=['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'],
                            is_active=True
                        )
                        usuarios_notificar.extend(analistas_oficiales)
                        
                        # Remove duplicates
                        usuarios_notificar = list(set(usuarios_notificar))
                        
                        # Send notifications
                        for usuario in usuarios_notificar:
                            NotificationService.create_notification(
                                usuario=usuario,
                                tipo='TAREA_VENCIMIENTO',
                                titulo=f'Recordatorio: {tarea.titulo} vence en {intervalo} día(s)',
                                mensaje=f'La tarea "{tarea.titulo}" vence el {fecha_vencimiento.strftime("%d/%m/%Y")} ({intervalo} día(s) restantes)',
                                tarea=tarea,
                                metadata={
                                    'dias_restantes': intervalo,
                                    'fecha_vencimiento': fecha_vencimiento.isoformat(),
                                    'notificacion_programada': True
                                }
                            )
                            notifications_sent += 1
                        
                        # Mark as sent
                        config.notificaciones_enviadas[str(intervalo)] = today.isoformat()
                        config.save(update_fields=['notificaciones_enviadas'])
                        
                        logger.info(f"Sent scheduled notification for task {tarea.id}, interval {intervalo} days")
            
            configs_processed += 1
        
        result = {
            'configs_processed': configs_processed,
            'notifications_sent': notifications_sent,
            'date': today.isoformat()
        }
        
        logger.info(f"Scheduled notifications check completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in scheduled notifications check: {str(e)}", exc_info=True)
        raise


@shared_task(name='notificaciones.send_daily_task_notifications')
def send_daily_task_notifications():
    """
    Celery task to send daily task notifications
    Scheduled to run at 9:00 AM UTC-3
    """
    logger.info("Starting daily task notifications job")
    
    try:
        result = NotificationService.send_daily_task_notifications()
        logger.info(f"Daily task notifications completed successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Error in daily task notifications: {str(e)}", exc_info=True)
        raise


@shared_task(name='notificaciones.notify_task_assignment')
def notify_task_assignment_task(tarea_id, usuario_ids):
    """
    Celery task to notify users about task assignment
    Can be called asynchronously when tasks are assigned
    """
    try:
        from apps.tareas.models import TareaCumplimiento
        from apps.authentication.models import Usuario
        
        tarea = TareaCumplimiento.objects.get(id=tarea_id)
        usuarios = Usuario.objects.filter(id__in=usuario_ids)
        
        NotificationService.notify_task_assignment(tarea, list(usuarios))
        
        logger.info(f"Task assignment notifications sent for task {tarea_id}")
        return {'tarea_id': tarea_id, 'usuarios_notified': len(usuarios)}
    except Exception as e:
        logger.error(f"Error in task assignment notification: {str(e)}", exc_info=True)
        raise


@shared_task(name='notificaciones.notify_stage_change')
def notify_stage_change_task(tarea_id, usuario_ids, estado_anterior, estado_nuevo):
    """
    Celery task to notify users about task stage change
    """
    try:
        from apps.tareas.models import TareaCumplimiento
        from apps.authentication.models import Usuario

        tarea = TareaCumplimiento.objects.get(id=tarea_id)
        usuarios = Usuario.objects.filter(id__in=usuario_ids)

        for usuario in usuarios:
            NotificationService.notify_task_stage_change(
                tarea, usuario, estado_anterior, estado_nuevo
            )

        logger.info(f"Stage change notifications sent for task {tarea_id}")
        return {'tarea_id': tarea_id, 'usuarios_notified': len(usuarios)}
    except Exception as e:
        logger.error(f"Error in stage change notification: {str(e)}", exc_info=True)
        raise


@shared_task(name='notificaciones.notify_new_comment')
def notify_new_comment_task(comentario_id, autor_id):
    """
    Celery task to notify users about a new comment on a task.
    Called asynchronously from the comentario_tarea_created signal.
    """
    try:
        from apps.tareas.models import ComentarioTarea
        from apps.authentication.models import Usuario

        comentario = ComentarioTarea.objects.get(id=comentario_id)
        autor = Usuario.objects.get(id=autor_id)

        NotificationService.notify_new_comment(comentario=comentario, autor=autor)

        logger.info(f"Comment notifications sent for comment {comentario_id}")
        return {'comentario_id': comentario_id, 'autor_id': autor_id}
    except Exception as e:
        logger.error(f"Error in comment notification: {str(e)}", exc_info=True)
        raise


@shared_task(name='notificaciones.notify_file_upload')
def notify_file_upload_task(archivo_id, uploader_id):
    """
    Celery task to notify users about a new file upload on a task.
    Called asynchronously from the archivo_respaldo_created signal.
    """
    try:
        from apps.tareas.models import ArchivoRespaldo
        from apps.authentication.models import Usuario

        archivo = ArchivoRespaldo.objects.get(id=archivo_id)
        uploader = Usuario.objects.get(id=uploader_id)

        NotificationService.notify_file_upload(archivo=archivo, uploader=uploader)

        logger.info(f"File upload notifications sent for file {archivo_id}")
        return {'archivo_id': archivo_id, 'uploader_id': uploader_id}
    except Exception as e:
        logger.error(f"Error in file upload notification: {str(e)}", exc_info=True)
        raise
