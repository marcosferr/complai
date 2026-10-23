#!/usr/bin/env python
"""
Script to reset PostgreSQL sequences for all tables.
This fixes the "duplicate key value violates unique constraint" error.
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set the Django settings module
default_settings = 'config.settings.development'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', os.getenv('DJANGO_SETTINGS_MODULE', default_settings))
django.setup()

from django.db import connection


def reset_sequences():
    """Reset all PostgreSQL sequences to match the current max ID"""
    with connection.cursor() as cursor:
        # Get all tables with sequences
        cursor.execute("""
            SELECT 
                tc.table_name, 
                tc.table_schema,
                c.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
            JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
                AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
            WHERE constraint_type = 'PRIMARY KEY'
                AND c.column_default LIKE 'nextval%'
                AND tc.table_schema NOT IN ('pg_catalog', 'information_schema');
        """)
        
        tables = cursor.fetchall()
        
        if not tables:
            print("No tables with sequences found.")
            return
        
        print(f"Found {len(tables)} tables with sequences to reset:\n")
        
        for table_name, schema_name, column_name in tables:
            try:
                # Get the sequence name
                cursor.execute(f"""
                    SELECT pg_get_serial_sequence('{schema_name}.{table_name}', '{column_name}');
                """)
                sequence_result = cursor.fetchone()
                
                if not sequence_result or not sequence_result[0]:
                    print(f"  ⚠️  Skipping {schema_name}.{table_name} - no sequence found")
                    continue
                
                sequence_name = sequence_result[0]
                
                # Get the max ID from the table
                cursor.execute(f"""
                    SELECT COALESCE(MAX({column_name}), 0) + 1 
                    FROM {schema_name}.{table_name};
                """)
                max_id = cursor.fetchone()[0]
                
                # Reset the sequence
                cursor.execute(f"""
                    SELECT setval('{sequence_name}', {max_id}, false);
                """)
                
                print(f"  ✅ Reset {schema_name}.{table_name}.{column_name} sequence to {max_id}")
                
            except Exception as e:
                print(f"  ❌ Error resetting {schema_name}.{table_name}: {e}")
        
        print("\n✨ Sequence reset complete!")


if __name__ == "__main__":
    print("=" * 60)
    print("PostgreSQL Sequence Reset Tool")
    print("=" * 60)
    print("\nThis will reset all sequences to match current max IDs.\n")
    
    try:
        reset_sequences()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
