from rest_framework import serializers
from .models import Usuario
from .validators import validate_password_strength
from .permissions import es_administrador
from apps.tareas.models import Area


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()  # Can be email or username
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='email', read_only=True)
    area = serializers.IntegerField(source='area.id', read_only=True, allow_null=True)
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, allow_null=True)
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'role',
            'phone', 'department', 'area', 'area_nombre', 'is_active',
            'tutorial_completed', 'tutorial_step'
        ]
        read_only_fields = ['id']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users"""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    area = serializers.PrimaryKeyRelatedField(
        queryset=Area.objects.none(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Usuario
        fields = [
            'email', 'first_name', 'last_name', 'password', 'password_confirm',
            'role', 'phone', 'department', 'area'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            self.fields['area'].queryset = Area.objects.filter(activo=True)

        # Solo un administrador elige el rol del alta (A.5.15). Para el resto el
        # campo se ignora y el modelo aplica su default (RESPONSABLE).
        if not es_administrador(getattr(request, 'user', None)):
            self.fields['role'].read_only = True

    def validate_password(self, value):
        errors = validate_password_strength(value)
        if errors:
            raise serializers.ValidationError(errors)
        return value
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden'})
        role = data.get('role')
        area = data.get('area')
        if role != 'ADMIN' and area is None:
            raise serializers.ValidationError({'area': 'El área es requerida para roles no administradores.'})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        area = validated_data.pop('area', None)
        
        # Set username to email
        validated_data['username'] = validated_data['email']
        if area:
            validated_data['area'] = area
            validated_data['department'] = area.nombre

        # Create user without validation (password not set yet)
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save(skip_validation=False)  # Now we can validate with password set
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users"""
    password = serializers.CharField(write_only=True, required=False, min_length=8, allow_blank=True)
    area = serializers.PrimaryKeyRelatedField(
        queryset=Area.objects.none(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = Usuario
        fields = [
            'email', 'first_name', 'last_name', 'password', 'role',
            'phone', 'department', 'area', 'is_active'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            self.fields['area'].queryset = Area.objects.filter(activo=True)

        # Segunda capa sobre el permiso de la vista (A.5.15): los campos que
        # otorgan privilegio solo son escribibles para un administrador. Así el
        # serializer sigue siendo seguro si mañana se reusa desde otro endpoint.
        if not es_administrador(getattr(request, 'user', None)):
            for campo in ('role', 'is_active', 'email', 'password'):
                if campo in self.fields:
                    self.fields[campo].read_only = True

    def validate_password(self, value):
        if value:  # Only validate if password is provided
            errors = validate_password_strength(value)
            if errors:
                raise serializers.ValidationError(errors)
        return value

    def validate(self, data):
        role = data.get('role', self.instance.role if self.instance else None)
        area = data.get('area', serializers.empty)
        if role != 'ADMIN':
            if area is serializers.empty:
                current_area = self.instance.area if self.instance else None
                if current_area is None:
                    raise serializers.ValidationError({'area': 'El área es requerida para roles no administradores.'})
            else:
                if area is None:
                    raise serializers.ValidationError({'area': 'El área es requerida para roles no administradores.'})
        return data
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        area = validated_data.pop('area', serializers.empty)
        
        # Update username if email changes
        if 'email' in validated_data:
            validated_data['username'] = validated_data['email']
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if area is not serializers.empty:
            instance.area = area
            instance.department = area.nombre if area else ''
        
        if password:
            instance.set_password(password)
        
        # Save with validation (password already set if provided)
        instance.save(skip_validation=False)
        return instance


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate_password(self, value):
        errors = validate_password_strength(value)
        if errors:
            raise serializers.ValidationError(errors)
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden'})
        return data
