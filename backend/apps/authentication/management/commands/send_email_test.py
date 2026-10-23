from django.core.management.base import BaseCommand
from django.core.mail import send_mail, get_connection
from django.conf import settings


class Command(BaseCommand):
    help = 'Send a test email to verify email integration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email address to send the test email to',
        )
        parser.add_argument(
            '--real-email',
            action='store_true',
            help='Send real email using SMTP instead of console backend',
        )

    def handle(self, *args, **options):
        email = options['email']
        use_real_email = options['real_email']
        
        self.stdout.write(f'Sending test email to {email}...')
        
        # Use SMTP backend if --real-email flag is provided
        if use_real_email:
            connection = get_connection('django.core.mail.backends.smtp.EmailBackend')
            self.stdout.write('Using SMTP backend for real email sending...')
        else:
            connection = None  # Use default backend (console in development)
        
        try:
            send_mail(
                subject='Test Email',
                message='Hi',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                connection=connection,
            )
            backend_type = 'SMTP' if use_real_email else 'console'
            self.stdout.write(
                self.style.SUCCESS(f'Successfully sent test email to {email} via {backend_type} backend')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to send email: {str(e)}')
            )