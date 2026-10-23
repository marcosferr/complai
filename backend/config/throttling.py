"""
Throttles por IP con scope fijo.

**Por qué existe este módulo en vez de usar `ScopedRateThrottle` directamente.**

El patrón habitual —y el que traía este proyecto— era:

    class _LoginThrottle(ScopedRateThrottle):
        scope = 'login'

    @api_view(['POST'])
    @throttle_classes([_LoginThrottle])
    def login_view(request): ...

y **no hacía absolutamente nada**. `ScopedRateThrottle.allow_request()` arranca así:

    self.scope = getattr(view, self.scope_attr, None)   # 'throttle_scope'
    if not self.scope:
        return True

o sea que pisa el `scope` de la clase con el atributo `throttle_scope` de la *view*,
y si la view no lo define deja pasar todo. Una función decorada con `@api_view` no
tiene `throttle_scope`, así que el límite nunca se evalúa: el login queda sin
protección de fuerza bruta. Falla en silencio — ni
error ni warning. Un control que figura puesto y no corre es peor que uno ausente,
porque nadie lo va a volver a mirar.

`ScopedRateThrottle` sirve para vistas de CLASE que declaran `throttle_scope` como
atributo. Para funciones hay que usar un `SimpleRateThrottle`, que lee `self.scope`
en su `__init__`.

Estas clases además siempre limitan por IP aunque quien pide esté autenticado: en un
login o en un endpoint público la identidad todavía no existe o no es de fiar, y lo
que hay que acotar es el origen.

ISO/IEC 27001 A.8.5 (autenticación segura), A.8.6 (gestión de capacidad).
"""

from __future__ import annotations

from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class IPRateThrottle(SimpleRateThrottle):
    """Base: limita por IP de origen, con el scope fijado en la subclase."""

    scope: str = ''

    def get_ident(self, request):
        """La IP del cliente, contando los saltos de proxy DESDE LA DERECHA.

        Detrás del Apache/nginx del servidor, `REMOTE_ADDR` es el proxy: sin mirar
        `X-Forwarded-For` todos los visitantes comparten una sola cuota y el primero
        que se pasa deja afuera a los demás.

        Pero el primer elemento de ese header **lo pone quien llama**, no el proxy:
        nginx usa `$proxy_add_x_forwarded_for`, que AGREGA al valor recibido. Si el
        cliente manda `X-Forwarded-For: loquesea`, Django ve
        `loquesea, <cliente>, <apache>`. Leer el primero es leer lo que el atacante
        escribió, y rotarlo en cada pedido saltea el límite por completo — que es
        justo lo que este módulo existe para impedir.

        Se cuenta desde la derecha: cada proxy de confianza agrega exactamente una
        entrada, así que con N proxies el cliente real está en `ips[-N]`. Todo lo
        que esté más a la izquierda es texto sin verificar y se descarta.

        `TRUSTED_PROXY_HOPS` describe la topología del despliegue. En desarrollo no
        hay header y se cae a `REMOTE_ADDR`, que ahí sí es el cliente.
        """
        saltos = getattr(settings, 'TRUSTED_PROXY_HOPS', 0)
        reenviada = request.META.get('HTTP_X_FORWARDED_FOR') or ''
        if saltos > 0:
            ips = [ip.strip() for ip in reenviada.split(',') if ip.strip()]
            if len(ips) >= saltos:
                return ips[-saltos]
        return request.META.get('REMOTE_ADDR')

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class LoginThrottle(IPRateThrottle):
    """Fuerza bruta contra el login local."""

    scope = 'login'


class PasswordResetThrottle(IPRateThrottle):
    """Recuperación de contraseña: sin límite es un generador de correo gratis."""

    scope = 'password_reset'
