# Comando de Envío de Emails de Prueba

## Descripción
Comando de Django management para enviar emails de prueba con HTML estilizado y optimizado para Gmail.

## Uso Básico

### Con configuración por defecto de Django
```bash
python manage.py send_test_email --email destinatario@ejemplo.com
```

### Con servidor SMTP personalizado (Gmail)
```bash
python manage.py send_test_email \
  --email ferreiramarcosadrian@gmail.com \
  --smtp smtp.gmail.com \
  --port 587 \
  --user tu-email@gmail.com \
  --password tu-app-password
```

## Opciones

- `--email`: (Requerido) Email del destinatario
- `--smtp`: Servidor SMTP personalizado (default: configuración de Django)
- `--port`: Puerto SMTP (default: 587)
- `--user`: Usuario SMTP (default: configuración de Django)
- `--password`: Contraseña SMTP (default: configuración de Django)

## Configuración para Gmail

### 1. Habilitar contraseñas de aplicación
1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Seguridad → Verificación en dos pasos (debe estar activada)
3. Seguridad → Contraseñas de aplicaciones
4. Genera una contraseña de aplicación para "Correo"
5. Usa esta contraseña en el comando

### 2. Configurar variables de entorno (opcional)
En tu archivo `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-app-password-de-16-caracteres
DEFAULT_FROM_EMAIL=tu-email@gmail.com
```

### 3. Ejecutar con configuración del .env
```bash
python manage.py send_test_email --email ferreiramarcosadrian@gmail.com
```

## Características del Email

El email de prueba incluye:
- ✅ Header con logo y branding de ComplianceFlow
- ✅ Banner hero con gradiente y título
- ✅ Tarjeta de resumen de tareas
- ✅ Secciones por tipo de riesgo (Legal, Contractual, Laboral)
- ✅ Iconos visuales para cada tipo de tarea
- ✅ Fechas de vencimiento con colores (urgente en rojo, próximo en ámbar)
- ✅ Botón CTA "Ir a Mis Tareas"
- ✅ Footer con enlaces de configuración
- ✅ **Optimizado para Gmail** (tabla-based layout)
- ✅ **Responsive** (mobile-friendly)
- ✅ **Dark mode compatible**

## Estructura de Archivos

```
backend/
├── apps/notificaciones/management/commands/
│   └── send_test_email.py          # Comando de management
└── templates/emails/
    └── recordatorio_tareas_estilizado.html  # Plantilla HTML
```

## Ejemplo de Output

```
Enviando email de prueba...
Destinatario: ferreiramarcosadrian@gmail.com
SMTP: smtp.gmail.com:587
✓ Email enviado exitosamente a ferreiramarcosadrian@gmail.com
```

## Troubleshooting

### Error: "SMTPAuthenticationError"
- Verifica que la verificación en dos pasos esté activada
- Usa una contraseña de aplicación, no tu contraseña regular
- Verifica el usuario y contraseña SMTP

### Error: "SMTPConnectError"
- Verifica que el puerto sea 587 (TLS) o 465 (SSL)
- Verifica que `EMAIL_USE_TLS=True` esté configurado

### Error: "Template does not exist"
- Verifica que el archivo `templates/emails/recordatorio_tareas_estilizado.html` exista
- Verifica que `TEMPLATES` en settings.py incluya el directorio `templates`

## Datos de Prueba

El comando envía datos de ejemplo:
- Usuario: "Usuario de Prueba"
- Total de tareas: 12
- 3 categorías de riesgo con tareas de ejemplo
- Fechas de vencimiento relativas (43, 46, 64, 80 días desde hoy)

## Integración con el Sistema Real

Para usar esta plantilla en el sistema de notificaciones real:

1. Importar en `apps/notificaciones/tasks.py`:
```python
from django.template.loader import render_to_string

def send_daily_task_notifications():
    # ... tu lógica de obtención de tareas ...
    
    context = {
        'nombre_usuario': usuario.get_full_name(),
        'total_tareas': total,
        'frontend_url': settings.FRONTEND_URL,
        'tareas_por_riesgo': tareas_agrupadas,
    }
    
    html_message = render_to_string(
        'emails/recordatorio_tareas_estilizado.html', 
        context
    )
    
    send_mail(
        subject='Recordatorio: Tareas de Cumplimiento',
        message='...',
        html_message=html_message,
        ...
    )
```

## Referencias

- [Django Email Backends](https://docs.djangoproject.com/en/4.2/topics/email/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Email HTML Best Practices](https://www.campaignmonitor.com/css/)
