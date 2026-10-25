"""
Notification service for sending emails and creating internal notifications
"""
import logging
import os
from datetime import timedelta
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.db.models import Q

from apps.authentication.models import Usuario
from apps.tareas.models import TareaCumplimiento
from .models import Notificacion

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications and emails"""
    
    @staticmethod
    def get_app_url():
        """Get the application URL from settings"""
        return getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    
    @staticmethod
    def send_email(subject, to_emails, html_content, text_content=None):
        """Send an email with HTML content and embedded owl image"""
        try:
            if isinstance(to_emails, str):
                to_emails = [to_emails]
            
            # Filter out empty emails
            to_emails = [email for email in to_emails if email]
            
            if not to_emails:
                logger.warning("No valid email addresses provided")
                return False
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content or "Por favor, habilita HTML para ver este correo.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=to_emails
            )
            msg.attach_alternative(html_content, "text/html")
            
            # Attach owl reading image
            owl_image_path = os.path.join(settings.BASE_DIR, 'static', 'owl_reading.png')
            if os.path.exists(owl_image_path):
                with open(owl_image_path, 'rb') as img:
                    msg_img = msg.attach(filename='owl_reading.png', content=img.read(), mimetype='image/png')
                    # Set Content-ID for inline embedding
                    msg.mixed_subtype = 'related'
                    # Add Content-ID header to the image
                    from email.mime.image import MIMEImage
                    img_data = open(owl_image_path, 'rb').read()
                    img_mime = MIMEImage(img_data)
                    img_mime.add_header('Content-ID', '<owl_reading>')
                    img_mime.add_header('Content-Disposition', 'inline', filename='owl_reading.png')
                    msg.attach(img_mime)
            else:
                logger.warning(f"Owl image not found at {owl_image_path}")
            
            msg.send()
            
            logger.info(f"Email sent successfully to {len(to_emails)} recipients")
            return True
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    def create_notification(usuario, tipo, titulo, mensaje, tarea=None, metadata=None):
        """Create an internal notification"""
        try:
            notificacion = Notificacion.objects.create(
                usuario=usuario,
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                tarea=tarea,
                metadata=metadata or {}
            )
            logger.info(f"Notification created for user {usuario.email}: {titulo}")
            return notificacion
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}", exc_info=True)
            return None
    
    @classmethod
    def notify_task_assignment(cls, tarea, usuarios):
        """Notify users about a new task assignment"""
        try:
            if not isinstance(usuarios, list):
                usuarios = [usuarios]
            
            app_url = cls.get_app_url()
            tarea_url = f"{app_url}/tareas?taskId={tarea.id}"
            
            for usuario in usuarios:
                # Build detailed message
                mensaje_partes = [
                    f'📋 Tarea: {tarea.titulo}',
                    f'📅 Vencimiento: {tarea.fecha_vencimiento.strftime("%d/%m/%Y")}',
                    f'⏰ Días restantes: {tarea.dias_restantes}',
                    f'⚡ Prioridad: {tarea.get_prioridad_display()}',
                ]
                
                if tarea.area:
                    mensaje_partes.append(f'🏢 Área: {tarea.area.nombre}')
                
                if tarea.descripcion:
                    # Limit description to 200 chars
                    desc = tarea.descripcion[:200] + '...' if len(tarea.descripcion) > 200 else tarea.descripcion
                    mensaje_partes.append(f'\n{desc}')
                
                mensaje = '\n'.join(mensaje_partes)
                
                # Create internal notification with rich metadata
                cls.create_notification(
                    usuario=usuario,
                    tipo='TAREA_ASIGNADA',
                    titulo=f'Nueva tarea asignada: {tarea.titulo}',
                    mensaje=mensaje,
                    tarea=tarea,
                    metadata={
                        'dias_restantes': tarea.dias_restantes,
                        'prioridad': tarea.prioridad,
                        'etapa': tarea.etapa_actual,
                        'estado': tarea.estado_etapa,
                        'area_id': tarea.area.id if tarea.area else None,
                        'area_nombre': tarea.area.nombre if tarea.area else None,
                    }
                )
                
                # Send email
                context = {
                    'usuario_nombre': usuario.get_full_name() or usuario.email,
                    'tarea': tarea,
                    'tarea_url': tarea_url,
                }
                
                html_content = render_to_string('emails/tarea_asignada.html', context)
                
                cls.send_email(
                    subject=f'Nueva Tarea Asignada: {tarea.titulo}',
                    to_emails=[usuario.email],
                    html_content=html_content
                )
            
            logger.info(f"Task assignment notifications sent for task {tarea.id}")
        except Exception as e:
            logger.error(f"Error notifying task assignment: {str(e)}", exc_info=True)
    
    @classmethod
    def notify_task_stage_change(cls, tarea, usuario, estado_anterior, estado_nuevo):
        """Notify about task stage/status change"""
        try:
            # Build detailed message
            mensaje_partes = [
                f'📋 Tarea: {tarea.titulo}',
                f'🔄 Cambio: {estado_anterior} → {estado_nuevo}',
                f'📊 Etapa actual: {tarea.get_etapa_actual_display()}',
                f'📅 Vencimiento: {tarea.fecha_vencimiento.strftime("%d/%m/%Y")}',
            ]
            
            if tarea.dias_restantes is not None:
                mensaje_partes.append(f'⏰ Días restantes: {tarea.dias_restantes}')
            
            if tarea.area:
                mensaje_partes.append(f'🏢 Área: {tarea.area.nombre}')
            
            mensaje = '\n'.join(mensaje_partes)
            
            cls.create_notification(
                usuario=usuario,
                tipo='CAMBIO_ESTADO',
                titulo=f'Cambio de estado: {tarea.titulo}',
                mensaje=mensaje,
                tarea=tarea,
                metadata={
                    'estado_anterior': estado_anterior,
                    'estado_nuevo': estado_nuevo,
                    'etapa': tarea.etapa_actual,
                    'prioridad': tarea.prioridad,
                    'dias_restantes': tarea.dias_restantes,
                    'area_id': tarea.area.id if tarea.area else None,
                    'area_nombre': tarea.area.nombre if tarea.area else None,
                }
            )
            
            logger.info(f"Stage change notification created for task {tarea.id}")
        except Exception as e:
            logger.error(f"Error notifying stage change: {str(e)}", exc_info=True)
    
    @classmethod
    def get_usuarios_to_notify(cls, tarea):
        """
        Get users who should receive notifications based on role rules:
        - ADMINISTRADOR_CONTRATO and ANALISTA_UOC: all notifications
        - DIRECTOR: only notifications for their area
        - RESPONSABLE: only notifications for tasks where they are responsables
        """
        from apps.authentication.models import Usuario
        
        usuarios_a_notificar = set()
        
        # 1. Get all Oficial and Analista (receive all notifications)
        oficiales_y_analistas = Usuario.objects.filter(
            role__in=['ADMINISTRADOR_CONTRATO', 'ANALISTA_UOC']
        )
        usuarios_a_notificar.update(oficiales_y_analistas)
        
        # 2. Get Gerentes of the task's area
        if tarea.area:
            gerentes = Usuario.objects.filter(
                role='DIRECTOR',
                area=tarea.area
            )
            usuarios_a_notificar.update(gerentes)
        
        # 3. Get all responsables assigned to the task
        responsables = tarea.responsables.all()
        usuarios_a_notificar.update(responsables)
        
        return list(usuarios_a_notificar)
    
    @classmethod
    def notify_new_comment(cls, comentario, autor):
        """
        Notify users about a new comment on a task
        Follows role-based rules
        """
        try:
            tarea = comentario.tarea
            app_url = cls.get_app_url()
            tarea_url = f"{app_url}/tareas?taskId={tarea.id}"
            
            # Get users to notify (excluding the comment author)
            usuarios_a_notificar = cls.get_usuarios_to_notify(tarea)
            usuarios_a_notificar = [u for u in usuarios_a_notificar if u.id != autor.id]
            
            for usuario in usuarios_a_notificar:
                # Build detailed message
                comentario_texto = comentario.texto[:150] + '...' if len(comentario.texto) > 150 else comentario.texto
                
                mensaje_partes = [
                    f'💬 {autor.get_full_name() or autor.email} comentó:',
                    f'"{comentario_texto}"',
                    '',
                    f'📋 Tarea: {tarea.titulo}',
                    f'📅 Vencimiento: {tarea.fecha_vencimiento.strftime("%d/%m/%Y")}',
                    f'📊 Etapa: {tarea.get_etapa_actual_display()}',
                ]
                
                if tarea.area:
                    mensaje_partes.append(f'🏢 Área: {tarea.area.nombre}')
                
                mensaje = '\n'.join(mensaje_partes)
                
                # Create internal notification
                cls.create_notification(
                    usuario=usuario,
                    tipo='COMENTARIO',
                    titulo=f'Nuevo comentario en: {tarea.titulo}',
                    mensaje=mensaje,
                    tarea=tarea,
                    metadata={
                        'comentario_id': comentario.id,
                        'autor_id': autor.id,
                        'autor_nombre': autor.get_full_name() or autor.email,
                        'comentario_fecha': comentario.fecha_creacion.isoformat(),
                        'prioridad': tarea.prioridad,
                        'etapa': tarea.etapa_actual,
                        'estado': tarea.estado_etapa,
                        'area_id': tarea.area.id if tarea.area else None,
                        'area_nombre': tarea.area.nombre if tarea.area else None,
                    }
                )
                
                # Send email
                context = {
                    'usuario_nombre': usuario.get_full_name() or usuario.email,
                    'tarea': tarea,
                    'comentario': comentario,
                    'autor': autor,
                    'tarea_url': tarea_url,
                }
                
                html_content = render_to_string('emails/nuevo_comentario.html', context)
                
                cls.send_email(
                    subject=f'Nuevo comentario en: {tarea.titulo}',
                    to_emails=[usuario.email],
                    html_content=html_content
                )
            
            logger.info(f"Comment notifications sent for task {tarea.id}, comment {comentario.id}")
        except Exception as e:
            logger.error(f"Error notifying new comment: {str(e)}", exc_info=True)
    
    @classmethod
    def notify_file_upload(cls, archivo, uploader):
        """
        Notify users about a new file uploaded to a task
        Follows role-based rules
        """
        try:
            tarea = archivo.tarea
            app_url = cls.get_app_url()
            tarea_url = f"{app_url}/tareas?taskId={tarea.id}"
            
            # Get users to notify (excluding the uploader)
            usuarios_a_notificar = cls.get_usuarios_to_notify(tarea)
            usuarios_a_notificar = [u for u in usuarios_a_notificar if u.id != uploader.id]
            
            # Format file size
            tamanio_str = ''
            if archivo.tamanio:
                if archivo.tamanio < 1024:
                    tamanio_str = f'{archivo.tamanio} bytes'
                elif archivo.tamanio < 1048576:
                    tamanio_str = f'{archivo.tamanio / 1024:.1f} KB'
                else:
                    tamanio_str = f'{archivo.tamanio / 1048576:.1f} MB'
            
            for usuario in usuarios_a_notificar:
                # Build detailed message
                mensaje_partes = [
                    f'📎 {uploader.get_full_name() or uploader.email} subió un archivo:',
                    f'📄 {archivo.nombre_original}',
                ]
                
                if tamanio_str:
                    mensaje_partes.append(f'💾 Tamaño: {tamanio_str}')
                
                if archivo.descripcion:
                    desc = archivo.descripcion[:100] + '...' if len(archivo.descripcion) > 100 else archivo.descripcion
                    mensaje_partes.append(f'📝 {desc}')
                
                mensaje_partes.extend([
                    '',
                    f'📋 Tarea: {tarea.titulo}',
                    f'📅 Vencimiento: {tarea.fecha_vencimiento.strftime("%d/%m/%Y")}',
                    f'📊 Etapa: {tarea.get_etapa_actual_display()}',
                ])
                
                if tarea.area:
                    mensaje_partes.append(f'🏢 Área: {tarea.area.nombre}')
                
                mensaje = '\n'.join(mensaje_partes)
                
                # Create internal notification
                cls.create_notification(
                    usuario=usuario,
                    tipo='ARCHIVO_SUBIDO',
                    titulo=f'Nuevo archivo en: {tarea.titulo}',
                    mensaje=mensaje,
                    tarea=tarea,
                    metadata={
                        'archivo_id': archivo.id,
                        'uploader_id': uploader.id,
                        'uploader_nombre': uploader.get_full_name() or uploader.email,
                        'archivo_nombre': archivo.nombre_original,
                        'archivo_tamanio': archivo.tamanio,
                        'archivo_tipo': archivo.tipo_mime,
                        'archivo_fecha': archivo.fecha_subida.isoformat(),
                        'prioridad': tarea.prioridad,
                        'etapa': tarea.etapa_actual,
                        'estado': tarea.estado_etapa,
                        'area_id': tarea.area.id if tarea.area else None,
                        'area_nombre': tarea.area.nombre if tarea.area else None,
                    }
                )
                
                # Send email
                context = {
                    'usuario_nombre': usuario.get_full_name() or usuario.email,
                    'tarea': tarea,
                    'archivo': archivo,
                    'uploader': uploader,
                    'tarea_url': tarea_url,
                }
                
                html_content = render_to_string('emails/nuevo_archivo.html', context)
                
                cls.send_email(
                    subject=f'Nuevo archivo en: {tarea.titulo}',
                    to_emails=[usuario.email],
                    html_content=html_content
                )
            
            logger.info(f"File upload notifications sent for task {tarea.id}, file {archivo.id}")
        except Exception as e:
            logger.error(f"Error notifying file upload: {str(e)}", exc_info=True)
    
    @classmethod
    def get_tasks_expiring_soon(cls, days=7):
        """Get tasks expiring within the specified number of days"""
        today = timezone.now().date()
        end_date = today + timedelta(days=days)
        
        # Exclude completed tasks
        estados_completados = ['VALIDADA', 'APROBADO_RECTORADO']
        
        return TareaCumplimiento.objects.filter(
            fecha_vencimiento__gte=today,
            fecha_vencimiento__lte=end_date
        ).exclude(
            estado_etapa__in=estados_completados
        ).select_related('area', 'creado_por', 'clausula').prefetch_related('responsables')
    
    @classmethod
    def send_daily_task_notifications(cls):
        """Send daily notifications about tasks expiring soon"""
        try:
            tareas = cls.get_tasks_expiring_soon(days=7)
            
            if not tareas:
                logger.info("No tasks expiring soon, skipping daily notifications")
                return
            
            app_url = cls.get_app_url()
            
            # Group tasks by user based on role
            user_tasks = {}
            
            # Get all Analistas and Oficiales (they see all tasks)
            analistas_oficiales = Usuario.objects.filter(
                role__in=['ANALISTA_UOC', 'ADMINISTRADOR_CONTRATO'],
                is_active=True
            )
            
            for usuario in analistas_oficiales:
                user_tasks[usuario] = list(tareas)
            
            # Get Gerentes (they see tasks from their area)
            gerentes = Usuario.objects.filter(
                role='DIRECTOR',
                is_active=True
            ).exclude(area__isnull=True)
            
            for gerente in gerentes:
                gerente_tasks = tareas.filter(area=gerente.area)
                if gerente_tasks:
                    user_tasks[gerente] = list(gerente_tasks)
            
            # Get Responsables (they see only their assigned tasks)
            for tarea in tareas:
                for responsable in tarea.responsables.filter(is_active=True):
                    if responsable not in user_tasks:
                        user_tasks[responsable] = []
                    user_tasks[responsable].append(tarea)
            
            # Send notifications to each user
            emails_sent = 0
            notifications_created = 0
            
            for usuario, user_task_list in user_tasks.items():
                if not user_task_list:
                    continue
                
                # Create internal notification
                cls.create_notification(
                    usuario=usuario,
                    tipo='TAREA_VENCIMIENTO',
                    titulo=f'Tienes {len(user_task_list)} tarea(s) próximas a vencer',
                    mensaje=f'Hay {len(user_task_list)} tarea(s) que vencen en los próximos 7 días',
                    metadata={'count': len(user_task_list)}
                )
                notifications_created += 1
                
                # Send email
                context = {
                    'usuario_nombre': usuario.get_full_name() or usuario.email,
                    'tareas': user_task_list,
                    'total_tareas': len(user_task_list),
                    'es_resumen_diario': True,
                    'app_url': app_url,
                }
                
                html_content = render_to_string('emails/tareas_proximas_vencer.html', context)
                
                success = cls.send_email(
                    subject=f'Resumen Diario - {len(user_task_list)} Tarea(s) Próximas a Vencer',
                    to_emails=[usuario.email],
                    html_content=html_content
                )
                
                if success:
                    emails_sent += 1
            
            logger.info(f"Daily notifications completed: {emails_sent} emails sent, {notifications_created} internal notifications created")
            return {
                'emails_sent': emails_sent,
                'notifications_created': notifications_created,
                'total_users': len(user_tasks),
                'total_tasks': len(tareas)
            }
        
        except Exception as e:
            logger.error(f"Error sending daily task notifications: {str(e)}", exc_info=True)
            raise
