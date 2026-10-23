"""
Django signals for automatic notifications
"""
import logging
from django.db.models.signals import post_save, m2m_changed, pre_save
from django.dispatch import receiver

from apps.tareas.models import TareaCumplimiento, HistorialEstadoTarea, ComentarioTarea, ArchivoRespaldo
from .models import NotificacionConfiguracion
from .tasks import (
    notify_task_assignment_task,
    notify_new_comment_task,
    notify_file_upload_task,
    notify_stage_change_task,
)

logger = logging.getLogger(__name__)


@receiver(m2m_changed, sender=TareaCumplimiento.responsables.through)
def task_responsables_changed(sender, instance, action, pk_set, **kwargs):
    """
    Send notification when responsables are added to a task
    """
    if action == "post_add" and pk_set:
        # Only notify newly added responsables
        from apps.authentication.models import Usuario
        
        try:
            usuarios = Usuario.objects.filter(id__in=pk_set)
            
            # Send notifications asynchronously
            notify_task_assignment_task.delay(
                tarea_id=instance.id,
                usuario_ids=list(pk_set)
            )
            
            logger.info(f"Queued task assignment notifications for task {instance.id}")
        except Exception as e:
            logger.error(f"Error queuing task assignment notifications: {str(e)}", exc_info=True)


@receiver(post_save, sender=HistorialEstadoTarea)
def task_status_changed(sender, instance, created, **kwargs):
    """
    Send notification when task status changes
    """
    if created:
        try:
            tarea = instance.tarea

            # Collect all user IDs to notify
            usuario_ids = set(tarea.responsables.values_list('id', flat=True))

            if tarea.area:
                gerente_ids = tarea.area.usuarios.filter(role='GERENTE').values_list('id', flat=True)
                usuario_ids.update(gerente_ids)

            if usuario_ids:
                notify_stage_change_task.delay(
                    tarea_id=tarea.id,
                    usuario_ids=list(usuario_ids),
                    estado_anterior=instance.estado_anterior or 'N/A',
                    estado_nuevo=instance.estado_nuevo
                )

            logger.info(f"Queued status change notifications for task {tarea.id}")
        except Exception as e:
            logger.error(f"Error queuing status change notifications: {str(e)}", exc_info=True)


@receiver(pre_save, sender=TareaCumplimiento)
def store_old_fecha_vencimiento(sender, instance, **kwargs):
    """
    Store the old fecha_vencimiento value before saving
    """
    if instance.pk:
        try:
            old_instance = TareaCumplimiento.objects.get(pk=instance.pk)
            instance._old_fecha_vencimiento = old_instance.fecha_vencimiento
        except TareaCumplimiento.DoesNotExist:
            instance._old_fecha_vencimiento = None


@receiver(post_save, sender=TareaCumplimiento)
def tarea_fecha_vencimiento_changed(sender, instance, created, **kwargs):
    """
    Reset notification tracking when fecha_vencimiento changes
    """
    if not created and hasattr(instance, '_old_fecha_vencimiento'):
        try:
            # Check if fecha_vencimiento has changed
            if instance._old_fecha_vencimiento != instance.fecha_vencimiento:
                # Get the notification config if it exists
                if hasattr(instance, 'notificacion_config'):
                    config = instance.notificacion_config
                    # Reset sent notifications tracking
                    config.resetear_notificaciones_enviadas()
                    logger.info(f"Reset notification tracking for task {instance.id} due to fecha_vencimiento change")
        except Exception as e:
            logger.error(f"Error resetting notification tracking: {str(e)}", exc_info=True)


@receiver(post_save, sender=ComentarioTarea)
def comentario_tarea_created(sender, instance, created, **kwargs):
    """
    Send notification when a new comment is added to a task
    """
    if created:
        try:
            notify_new_comment_task.delay(
                comentario_id=instance.id,
                autor_id=instance.usuario_id
            )
            logger.info(f"Queued notifications for new comment on task {instance.tarea_id}")
        except Exception as e:
            logger.error(f"Error queuing comment notification: {str(e)}", exc_info=True)


@receiver(post_save, sender=ArchivoRespaldo)
def archivo_respaldo_created(sender, instance, created, **kwargs):
    """
    Send notification when a new file is uploaded to a task
    """
    if created:
        try:
            notify_file_upload_task.delay(
                archivo_id=instance.id,
                uploader_id=instance.subido_por_id
            )
            logger.info(f"Queued notifications for new file on task {instance.tarea_id}")
        except Exception as e:
            logger.error(f"Error queuing file upload notification: {str(e)}", exc_info=True)
