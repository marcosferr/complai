"""
Custom password validators for strong password policy.
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class StrongPasswordValidator:
    """
    Validates that a password meets strong security requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    """
    
    def __init__(self, min_length=8):
        self.min_length = min_length
    
    def validate(self, password, user=None):
        errors = []
        
        if len(password) < self.min_length:
            errors.append(
                ValidationError(
                    _('La contraseña debe tener al menos %(min_length)d caracteres.'),
                    code='password_too_short',
                    params={'min_length': self.min_length},
                )
            )
        
        if not re.search(r'[A-Z]', password):
            errors.append(
                ValidationError(
                    _('La contraseña debe contener al menos una letra mayúscula.'),
                    code='password_no_upper',
                )
            )
        
        if not re.search(r'[a-z]', password):
            errors.append(
                ValidationError(
                    _('La contraseña debe contener al menos una letra minúscula.'),
                    code='password_no_lower',
                )
            )
        
        if not re.search(r'\d', password):
            errors.append(
                ValidationError(
                    _('La contraseña debe contener al menos un número.'),
                    code='password_no_digit',
                )
            )
        
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?~`]', password):
            errors.append(
                ValidationError(
                    _('La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{};\':"|,.<>/?~`).'),
                    code='password_no_special',
                )
            )
        
        if errors:
            raise ValidationError(errors)
    
    def get_help_text(self):
        return _(
            'La contraseña debe tener al menos %(min_length)d caracteres, '
            'incluir mayúsculas, minúsculas, números y caracteres especiales.'
        ) % {'min_length': self.min_length}


def validate_password_strength(password):
    """
    Utility function to validate password strength.
    Returns a list of error messages if validation fails, empty list otherwise.
    """
    errors = []
    
    if len(password) < 8:
        errors.append('La contraseña debe tener al menos 8 caracteres.')
    
    if not re.search(r'[A-Z]', password):
        errors.append('La contraseña debe contener al menos una letra mayúscula.')
    
    if not re.search(r'[a-z]', password):
        errors.append('La contraseña debe contener al menos una letra minúscula.')
    
    if not re.search(r'\d', password):
        errors.append('La contraseña debe contener al menos un número.')
    
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?~`]', password):
        errors.append('La contraseña debe contener al menos un carácter especial.')
    
    return errors
