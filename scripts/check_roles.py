from apps.authentication.models import Usuario

print("\nEstadísticas de usuarios por rol:")
print("=====================================")
for role, label in Usuario.ROLE_CHOICES:
    count = Usuario.objects.filter(role=role).count()
    print(f"{label}: {count} usuarios")
print("")
