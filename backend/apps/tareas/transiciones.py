"""Qué estados puede elegir cada rol para una obligación, según la etapa en que está.

Única fuente de estas reglas en el backend:
- `TareaCumplimientoSerializer.estados_disponibles` las expone al frontend (el selector del
  detalle y el tablero de arrastrar y soltar deciden con esa lista).
- `views.cambiar_estado_etapa` las hace cumplir: el frontend no es la autoridad.

Antes el endpoint solo miraba si el rol podía tocar la etapa actual y después aceptaba
cualquier estado de cualquier etapa (un Responsable podía pasar su obligación a
«Aprobado por el Rectorado»). Pasar de etapa es trabajo de «Avanzar etapa» y «Devolver con
observaciones», que tienen sus propias reglas; el/la Administrador/a de Contrato es la única excepción.
"""

ESTADOS_POR_ETAPA = {
    'INICIO': [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('REQUIERE_ATENCION', 'Requiere Atención'),
        ('OBSERVADO_GERENTE', 'Devuelto con Observaciones de la Dirección'),
    ],
    'REVISION_GERENCIAL': [
        ('REVISION_GERENCIAL', 'En Revisión de la Dirección'),
        ('VALIDADO_GERENTE', 'Validado por la Dirección'),
        ('OBSERVADO_ANALISTA', 'Con Observaciones de la UOC'),
    ],
    'CONTROL_ANALISTA': [
        ('REVISION_ANALISTA', 'En Revisión de la UOC'),
        ('EN_PROGRESO_ANALISTA', 'En Progreso (UOC)'),
        ('OBSERVADO_OFICIAL', 'Devuelto con Observaciones del Administrador'),
        ('PENDIENTE_VALIDACION_OFICIAL', 'Listo para Validación del Administrador'),
    ],
    'CONTROL_OFICIAL': [
        ('PENDIENTE_VALIDACION', 'Pendiente Validación'),
        ('VALIDADA', 'Validada'),
        ('REMITIDO_AUTORIDAD', 'Remitido al Rectorado'),
        ('OBSERVADO_AUTORIDAD', 'Observado por el Rectorado'),
        ('APROBADO_AUTORIDAD', '✅ Aprobado por el Rectorado'),
        ('RECHAZADO_AUTORIDAD', '❌ Rechazado por el Rectorado'),
    ],
}

# El Oficial elige entre los 17 estados en un solo selector: el color marca la etapa.
_MARCA_ETAPA = {
    'INICIO': '🔵',
    'REVISION_GERENCIAL': '🟢',
    'CONTROL_ANALISTA': '🟡',
    'CONTROL_OFICIAL': '🔴',
}

ETAPA_DE_ESTADO = {
    codigo: etapa
    for etapa, estados in ESTADOS_POR_ETAPA.items()
    for codigo, _ in estados
}

# Roles (además del Oficial) que pueden cambiar el estado de una obligación en cada etapa.
ROLES_POR_ETAPA = {
    'INICIO': ['RESPONSABLE', 'GERENTE'],
    'REVISION_GERENCIAL': ['GERENTE', 'ANALISTA_COMPLIANCE'],
    'CONTROL_ANALISTA': ['ANALISTA_COMPLIANCE'],
    'CONTROL_OFICIAL': [],
}

# Estados de la etapa que cada rol puede elegir. Lo que no figura, no lo elige.
# El Responsable no puede marcarse a sí mismo «observado por el gerente».
_EXCLUIDOS = {
    ('INICIO', 'RESPONSABLE'): {'OBSERVADO_GERENTE'},
}


def estados_disponibles(user, tarea):
    """Lista de `(codigo, etiqueta)` a los que `user` puede pasar `tarea`.

    No mira si el usuario está asignado ni si es de la misma área: eso lo resuelve
    `motivo_de_rechazo`, que es lo que usa el endpoint.
    """
    if user is None or not getattr(user, 'is_authenticated', False):
        return []

    if user.role == 'OFICIAL_COMPLIANCE':
        return [
            (codigo, f'{_MARCA_ETAPA[etapa]} {etiqueta}')
            for etapa, estados in ESTADOS_POR_ETAPA.items()
            for codigo, etiqueta in estados
        ]

    etapa = tarea.etapa_actual
    if user.role not in ROLES_POR_ETAPA.get(etapa, []):
        return []

    excluidos = _EXCLUIDOS.get((etapa, user.role), set())
    return [e for e in ESTADOS_POR_ETAPA.get(etapa, []) if e[0] not in excluidos]


def motivo_de_rechazo(user, tarea, nuevo_estado):
    """`None` si el cambio está permitido; si no, `(mensaje, status_http)`."""
    if nuevo_estado not in ETAPA_DE_ESTADO:
        return 'El estado elegido no existe.', 400

    if user.role == 'OFICIAL_COMPLIANCE':
        return None

    if user.role not in ROLES_POR_ETAPA.get(tarea.etapa_actual, []):
        return (
            f'Tu rol no puede cambiar el estado de obligaciones en la etapa '
            f'«{tarea.get_etapa_actual_display()}».',
            403,
        )

    if user.role == 'RESPONSABLE' and not tarea.responsables.filter(pk=user.pk).exists():
        return 'No estás asignado a esta obligación.', 403

    if user.role == 'GERENTE' and tarea.area_id != user.area_id:
        return 'Esta obligación no pertenece a tu área.', 403

    permitidos = {codigo for codigo, _ in estados_disponibles(user, tarea)}
    if nuevo_estado not in permitidos:
        if ETAPA_DE_ESTADO[nuevo_estado] != tarea.etapa_actual:
            return (
                'Ese estado corresponde a otra etapa. Para pasar la obligación de etapa '
                'usá «Avanzar etapa» o «Devolver con observaciones».',
                400,
            )
        return 'Tu rol no puede pasar la obligación a ese estado.', 400

    return None
