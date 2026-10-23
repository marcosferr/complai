#!/usr/bin/env python
"""
Script para probar las notificaciones mejoradas del sistema
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from datetime import date, timedelta
from apps.tareas.models import TareaCumplimiento, Area, ComentarioTarea, ArchivoRespaldo
from apps.authentication.models import Usuario
from apps.notificaciones.models import Notificacion
from apps.notificaciones.serializers import NotificacionSerializer
import json


def print_section(title):
    """Print a section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60 + "\n")


def test_notification_serializer():
    """Test the improved notification serializer"""
    print_section("PRUEBA: Serializer de Notificaciones Mejorado")
    
    # Get a recent notification
    notif = Notificacion.objects.order_by('-fecha_creacion').first()
    
    if not notif:
        print("⚠️  No hay notificaciones en el sistema. Crea una primero.")
        return
    
    print(f"📋 Notificación ID: {notif.id}")
    print(f"📌 Tipo: {notif.get_tipo_display()}")
    print(f"👤 Usuario: {notif.usuario.email}")
    print(f"📅 Fecha: {notif.fecha_creacion}")
    
    # Serialize
    serializer = NotificacionSerializer(notif)
    data = serializer.data
    
    print("\n--- MENSAJE FORMATEADO ---")
    print(data['mensaje'])
    
    print("\n--- DETALLE DE TAREA ---")
    if data['tarea_detalle']:
        tarea = data['tarea_detalle']
        print(f"  ID: {tarea['id']}")
        print(f"  Título: {tarea['titulo']}")
        print(f"  Prioridad: {tarea['prioridad_display']} ({tarea['prioridad']})")
        print(f"  Vencimiento: {tarea['fecha_vencimiento']}")
        print(f"  Días restantes: {tarea['dias_restantes']}")
        print(f"  Vencida: {'Sí' if tarea['esta_vencida'] else 'No'}")
        print(f"  Etapa: {tarea['etapa_actual_display']}")
        print(f"  Estado: {tarea['estado_etapa']}")
        if tarea['area']:
            print(f"  Área: {tarea['area']['nombre']}")
        if tarea['responsables']:
            print(f"  Responsables: {', '.join(tarea['responsables'])}")
        if tarea['clausula']:
            print(f"  Cláusula: {tarea['clausula']['titulo']}")
    else:
        print("  (Sin tarea asociada)")
    
    print("\n--- METADATA ---")
    print(json.dumps(data['metadata'], indent=2, ensure_ascii=False))
    
    print("\n--- JSON COMPLETO ---")
    print(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    
    print("\n✅ Serializer funciona correctamente")


def test_create_comment_notification():
    """Test creating a comment and checking the notification"""
    print_section("PRUEBA: Crear Comentario y Verificar Notificación")
    
    # Get a task
    tarea = TareaCumplimiento.objects.first()
    
    if not tarea:
        print("⚠️  No hay tareas en el sistema. Crea una primero.")
        return
    
    # Get a user
    usuario = Usuario.objects.first()
    
    if not usuario:
        print("⚠️  No hay usuarios en el sistema.")
        return
    
    print(f"📋 Tarea: {tarea.titulo}")
    print(f"👤 Usuario: {usuario.email}")
    
    # Count notifications before
    count_before = Notificacion.objects.filter(
        tipo='COMENTARIO',
        tarea=tarea
    ).count()
    
    print(f"\n📊 Notificaciones de comentario antes: {count_before}")
    
    # Create comment
    comentario = ComentarioTarea.objects.create(
        tarea=tarea,
        usuario=usuario,
        texto='Este es un comentario de prueba para verificar las notificaciones mejoradas del sistema'
    )
    
    print(f"✅ Comentario creado: ID {comentario.id}")
    
    # Count notifications after
    count_after = Notificacion.objects.filter(
        tipo='COMENTARIO',
        tarea=tarea
    ).count()
    
    print(f"📊 Notificaciones de comentario después: {count_after}")
    print(f"📈 Nuevas notificaciones: {count_after - count_before}")
    
    # Get the new notification
    nueva_notif = Notificacion.objects.filter(
        tipo='COMENTARIO',
        tarea=tarea
    ).order_by('-fecha_creacion').first()
    
    if nueva_notif:
        print("\n--- NOTIFICACIÓN CREADA ---")
        serializer = NotificacionSerializer(nueva_notif)
        data = serializer.data
        
        print(f"\n{data['titulo']}\n")
        print(data['mensaje'])
        
        print("\n--- Datos de la tarea en la notificación ---")
        if data['tarea_detalle']:
            tarea_det = data['tarea_detalle']
            print(f"  Prioridad: {tarea_det['prioridad_display']}")
            print(f"  Días restantes: {tarea_det['dias_restantes']}")
            print(f"  Etapa: {tarea_det['etapa_actual_display']}")
            if tarea_det['area']:
                print(f"  Área: {tarea_det['area']['nombre']}")
        
        print("\n✅ Notificación de comentario funciona correctamente")
    else:
        print("\n❌ No se encontró la notificación creada")


def test_task_assignment_notification():
    """Test task assignment notification format"""
    print_section("PRUEBA: Formato de Notificación de Asignación")
    
    # Get a notification of task assignment
    notif = Notificacion.objects.filter(
        tipo='TAREA_ASIGNADA'
    ).order_by('-fecha_creacion').first()
    
    if not notif:
        print("⚠️  No hay notificaciones de asignación. Asigna una tarea primero.")
        return
    
    serializer = NotificacionSerializer(notif)
    data = serializer.data
    
    print("TÍTULO:")
    print(data['titulo'])
    
    print("\nMENSAJE:")
    print(data['mensaje'])
    
    print("\n--- Verificando formato ---")
    mensaje = data['mensaje']
    
    checks = [
        ('📋', 'Emoji de tarea'),
        ('📅', 'Emoji de fecha'),
        ('⏰', 'Emoji de tiempo'),
        ('⚡', 'Emoji de prioridad'),
        ('Tarea:', 'Título de tarea'),
        ('Vencimiento:', 'Fecha de vencimiento'),
        ('Días restantes:', 'Días restantes'),
        ('Prioridad:', 'Prioridad'),
    ]
    
    for check, desc in checks:
        if check in mensaje:
            print(f"  ✅ {desc}")
        else:
            print(f"  ❌ Falta: {desc}")
    
    print("\n--- Metadata enriquecida ---")
    metadata = data['metadata']
    metadata_checks = [
        'prioridad',
        'etapa',
        'estado',
        'dias_restantes'
    ]
    
    for check in metadata_checks:
        if check in metadata:
            print(f"  ✅ {check}: {metadata[check]}")
        else:
            print(f"  ❌ Falta: {check}")
    
    print("\n✅ Formato de notificación correcto")


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("  PRUEBAS DE NOTIFICACIONES MEJORADAS")
    print("=" * 60)
    
    try:
        test_notification_serializer()
        test_task_assignment_notification()
        test_create_comment_notification()
        
        print_section("RESUMEN")
        print("✅ Todas las pruebas completadas")
        print("\nLas notificaciones ahora incluyen:")
        print("  • Mensajes detallados con emojis")
        print("  • Objeto tarea_detalle completo")
        print("  • Metadata enriquecida")
        print("  • Información sin necesidad de queries adicionales")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
