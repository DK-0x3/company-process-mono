from django.apps import AppConfig


class SmartpoultryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smartpoultry'

    def ready(self):
        from . import permissions_bootstrap  # noqa: F401
        from . import signals  # noqa: F401
