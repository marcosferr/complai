from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class Usuario(AbstractUser):
    """Custom user model for compliance tracking"""
    ROLE_CHOICES = [
        # Códigos internos estables; etiquetas del flujo universitario.
        ('OFICIAL_COMPLIANCE', 'Administrador/a de Contrato'),
        ('ANALISTA_COMPLIANCE', 'Analista de Contratos (UOC)'),
        ('GERENTE', 'Director/a de Dependencia'),
        ('RESPONSABLE', 'Responsable Técnico'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='RESPONSABLE')
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    area = models.ForeignKey(
        'tareas.Area',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='usuarios',
        verbose_name='Área'
    )
    # Tutorial tracking fields
    tutorial_completed = models.BooleanField(
        default=False,
        verbose_name='Tutorial Completado',
        help_text='Indica si el usuario ha completado el tutorial guiado'
    )
    tutorial_step = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Progreso del Tutorial',
        help_text='Almacena el estado de progreso de cada sección del tutorial'
    )
    
    class Meta:
        db_table = 'usuarios'
    
    def __str__(self):
        return self.email

    def clean(self):
        super().clean()
        # Administrador/a de Contrato no requiere dependencia
        if self.role not in ['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE'] and not self.area:
            raise ValidationError({'area': 'La dependencia es obligatoria salvo para el/la Administrador/a de Contrato.'})

    def save(self, *args, **kwargs):
        # Skip validation if explicitly requested (e.g., during user creation)
        skip_validation = kwargs.pop('skip_validation', False)
        
        if not skip_validation:
            self.full_clean()
        
        if self.area:
            self.department = self.area.nombre
        elif self.role in ['OFICIAL_COMPLIANCE', 'ANALISTA_COMPLIANCE']:
            self.department = ''
        super().save(*args, **kwargs)