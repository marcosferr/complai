"""
Django management command to send task notifications
Usage: python manage.py send_task_notifications [--test] [--email user@example.com]
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.notificaciones.services import NotificationService
from apps.authentication.models import Usuario


class Command(BaseCommand):
    help = 'Send notifications about tasks expiring soon'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test',
            action='store_true',
            help='Run in test mode (shows what would be sent without actually sending)',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Send test notification only to this email address',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to look ahead for expiring tasks (default: 7)',
        )

    def handle(self, *args, **options):
        test_mode = options['test']
        test_email = options.get('email')
        days = options['days']
        
        self.stdout.write(self.style.WARNING(f'\n{"="*60}'))
        self.stdout.write(self.style.WARNING('TASK NOTIFICATION COMMAND'))
        self.stdout.write(self.style.WARNING(f'{"="*60}\n'))
        
        if test_mode:
            self.stdout.write(self.style.NOTICE('Running in TEST MODE - no emails will be sent'))
        
        if test_email:
            self.stdout.write(self.style.NOTICE(f'Test email will be sent to: {test_email}'))
        
        self.stdout.write(f'Looking for tasks expiring in the next {days} days...\n')
        
        # Get tasks expiring soon
        tareas = NotificationService.get_tasks_expiring_soon(days=days)
        
        if not tareas:
            self.stdout.write(self.style.SUCCESS('✓ No tasks found expiring soon'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'Found {len(tareas)} tasks expiring soon:\n'))
        
        for tarea in tareas[:10]:  # Show first 10
            self.stdout.write(
                f'  • {tarea.titulo} '
                f'(vence: {tarea.fecha_vencimiento.strftime("%d/%m/%Y")}, '
                f'días restantes: {tarea.dias_restantes})'
            )
        
        if len(tareas) > 10:
            self.stdout.write(f'  ... y {len(tareas) - 10} más')
        
        self.stdout.write('')
        
        if test_email:
            # Send test notification to specific email
            self._send_test_notification(test_email, tareas, test_mode)
        else:
            # Send to all users as normal
            self._send_all_notifications(tareas, test_mode)
    
    def _send_test_notification(self, email, tareas, test_mode):
        """Send a test notification to a specific email"""
        try:
            usuario = Usuario.objects.filter(email=email).first()
            
            if not usuario:
                self.stdout.write(self.style.ERROR(f'✗ User not found with email: {email}'))
                return
            
            self.stdout.write(f'\nSending test notification to: {usuario.get_full_name()} ({email})')
            self.stdout.write(f'Role: {usuario.get_role_display()}\n')
            
            if test_mode:
                self.stdout.write(self.style.NOTICE('TEST MODE: Email would be sent but skipping actual send'))
                self.stdout.write(f'Would send notification about {len(tareas)} tasks')
            else:
                # Send email
                app_url = NotificationService.get_app_url()
                
                from django.template.loader import render_to_string
                context = {
                    'usuario_nombre': usuario.get_full_name() or usuario.email,
                    'tareas': list(tareas),
                    'total_tareas': len(tareas),
                    'es_resumen_diario': False,
                    'app_url': app_url,
                }
                
                html_content = render_to_string('emails/tareas_proximas_vencer.html', context)
                
                success = NotificationService.send_email(
                    subject=f'[TEST] {len(tareas)} Tarea(s) Próximas a Vencer',
                    to_emails=[email],
                    html_content=html_content
                )
                
                if success:
                    self.stdout.write(self.style.SUCCESS('✓ Test email sent successfully'))
                else:
                    self.stdout.write(self.style.ERROR('✗ Failed to send test email'))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Error: {str(e)}'))
    
    def _send_all_notifications(self, tareas, test_mode):
        """Send notifications to all users based on their role"""
        try:
            if test_mode:
                self.stdout.write(self.style.NOTICE('\nTEST MODE: Showing what would be sent:\n'))
                
                # Show what would be sent
                analistas_oficiales = Usuario.objects.filter(
                    role__in=['ANALISTA_COMPLIANCE', 'OFICIAL_COMPLIANCE'],
                    is_active=True
                )
                self.stdout.write(f'Analistas/Oficiales ({analistas_oficiales.count()}):')
                for user in analistas_oficiales:
                    self.stdout.write(f'  • {user.get_full_name()} ({user.email}) - {len(tareas)} tasks')
                
                gerentes = Usuario.objects.filter(role='GERENTE', is_active=True).exclude(area__isnull=True)
                self.stdout.write(f'\nGerentes ({gerentes.count()}):')
                for gerente in gerentes:
                    gerente_tasks = tareas.filter(area=gerente.area)
                    if gerente_tasks:
                        self.stdout.write(f'  • {gerente.get_full_name()} ({gerente.email}) - {len(gerente_tasks)} tasks')
                
                # Count responsables
                responsables_count = 0
                for tarea in tareas:
                    responsables_count += tarea.responsables.filter(is_active=True).count()
                
                self.stdout.write(f'\nResponsables: ~{responsables_count} notifications')
                
                self.stdout.write(self.style.NOTICE('\n[Test mode - no emails sent]'))
            else:
                self.stdout.write('\nSending notifications...\n')
                
                result = NotificationService.send_daily_task_notifications()
                
                self.stdout.write(self.style.SUCCESS(f'\n✓ Notifications sent successfully!'))
                self.stdout.write(f'  • Emails sent: {result["emails_sent"]}')
                self.stdout.write(f'  • Internal notifications: {result["notifications_created"]}')
                self.stdout.write(f'  • Total users notified: {result["total_users"]}')
                self.stdout.write(f'  • Total tasks: {result["total_tasks"]}')
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ Error sending notifications: {str(e)}'))
            raise
