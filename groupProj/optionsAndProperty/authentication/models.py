from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
import re


def validate_real_email_domain(value):
    """
    Custom validator that blocks fake email domains commonly used in testing.
    """
    # Block common fake TLDs used in testing
    fake_tlds = ['.bosh', '.test', '.example', '.local', '.invalid', '.localhost']
    for tld in fake_tlds:
        if value.endswith(tld):
            raise ValidationError(f'Enter a valid email address. {tld} domains are not allowed.')
    
    # Basic domain format check (must have at least one dot after @)
    if '@' in value:
        domain = value.split('@')[-1]
        if not re.match(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', domain):
            raise ValidationError('Enter a valid email address.')
    else:
        raise ValidationError('Enter a valid email address.')


class CustomUserManager(BaseUserManager):
    """Custom user manager where email is the unique identifier"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    """Custom user model that uses email instead of username"""
    username = None  # Remove username field
    email = models.EmailField(unique=True, validators=[validate_real_email_domain])
    first_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20, blank=True, null=True)  # ADD THIS LINE
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name']
    
    objects = CustomUserManager()
    
    def __str__(self):
        return self.email
    