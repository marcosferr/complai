"""
Comando de management para enviar emails de prueba con HTML estilizado.
Uso:
    python manage.py send_test_email --email destinatario@ejemplo.com
    python manage.py send_test_email --email destinatario@ejemplo.com --smtp smtp.gmail.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Envía un email de prueba con plantilla HTML estilizada para Gmail'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email del destinatario'
        )
        parser.add_argument(
            '--smtp',
            type=str,
            default='smtp.gmail.com',
            help='Servidor SMTP (default: smtp.gmail.com)'
        )
        parser.add_argument(
            '--port',
            type=int,
            default=587,
            help='Puerto SMTP (default: 587)'
        )
        parser.add_argument(
            '--user',
            type=str,
            default=None,
            help='Usuario SMTP (default: configuración de Django)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default=None,
            help='Contraseña SMTP (default: configuración de Django)'
        )
        parser.add_argument(
            '--from-email',
            type=str,
            default=None,
            help='Email del remitente (default: configuración de Django)'
        )

    def handle(self, *args, **options):
        recipient_email = options['email']
        smtp_host = options['smtp']
        smtp_port = options['port']
        smtp_user = options['user'] or settings.EMAIL_HOST_USER
        smtp_password = options['password'] or settings.EMAIL_HOST_PASSWORD
        from_email = options['from_email'] or settings.DEFAULT_FROM_EMAIL

        self.stdout.write(self.style.MIGRATE_HEADING('Enviando email de prueba...'))
        self.stdout.write(f'Destinatario: {recipient_email}')
        self.stdout.write(f'Remitente: {from_email}')
        self.stdout.write(f'SMTP: {smtp_host}:{smtp_port}')
        self.stdout.write(f'Usuario SMTP: {smtp_user}')

        # Datos de ejemplo para el email
        context = {
            'nombre_usuario': 'Usuario de Prueba',
            'total_tareas': 12,
            'frontend_url': settings.FRONTEND_URL,
            'tareas_por_riesgo': {
                'Riesgo Legal': [
                    {
                        'titulo': 'Revisar cláusula de confidencialidad',
                        'responsable': 'Ana Torres',
                        'fecha_vencimiento': date.today() + timedelta(days=43),
                        'es_urgente': True,
                        'icono': 'gavel'
                    },
                    {
                        'titulo': 'Actualizar política de privacidad',
                        'responsable': 'Carlos Ruiz',
                        'fecha_vencimiento': date.today() + timedelta(days=46),
                        'es_urgente': True,
                        'icono': 'gavel'
                    },
                ],
                'Riesgo Contractual': [
                    {
                        'titulo': 'Renovación de contrato con Proveedor X',
                        'responsable': 'Laura Gómez',
                        'fecha_vencimiento': date.today() + timedelta(days=64),
                        'es_urgente': False,
                        'icono': 'description'
                    },
                ],
                'Riesgo Laboral': [
                    {
                        'titulo': 'Capacitación anual sobre acoso laboral',
                        'responsable': 'RR.HH.',
                        'fecha_vencimiento': date.today() + timedelta(days=80),
                        'es_urgente': False,
                        'icono': 'groups'
                    },
                ],
            }
        }

        try:
            # Renderizar el HTML desde la plantilla
            html_message = render_to_string('emails/recordatorio_tareas_estilizado.html', context)

            # Configurar backend de email personalizado (siempre usar SMTP real)
            email_backend = EmailBackend(
                host=smtp_host,
                port=smtp_port,
                username=smtp_user,
                password=smtp_password,
                use_tls=True,
                fail_silently=False,
            )

            # Enviar el email
            send_mail(
                subject='Recordatorio: Tareas de Cumplimiento Próximas a Vencer',
                message='Este correo requiere un cliente de email que soporte HTML.',
                from_email=from_email,
                recipient_list=[recipient_email],
                html_message=html_message,
                fail_silently=False,
                connection=email_backend,
            )

            self.stdout.write(
                self.style.SUCCESS(f'✓ Email enviado exitosamente a {recipient_email}')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error al enviar el email: {str(e)}')
            )
            raise
