from django.contrib.auth.models import Group, Permission
from django.db.models.signals import post_migrate
from django.dispatch import receiver


@receiver(post_migrate)
def ensure_default_groups(sender, **kwargs):
    if sender.name != "smartpoultry":
        return

    owner_group, _ = Group.objects.get_or_create(name="Owner")
    Group.objects.get_or_create(name="Manager")

    owner_permissions = Permission.objects.filter(content_type__app_label="smartpoultry")
    owner_group.permissions.set(owner_permissions)
