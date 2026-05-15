from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create or update an Owner account and attach Owner group."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")

    def handle(self, *args, **options):
        username = options["username"]
        password = options["password"]
        first_name = options["first_name"]
        last_name = options["last_name"]

        owner_group = Group.objects.filter(name="Owner").first()
        if not owner_group:
            raise CommandError(
                "Owner group is missing. Run migrations first to initialize groups."
            )

        User = get_user_model()
        user, created = User.objects.get_or_create(username=username)
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = True
        user.is_staff = True
        user.set_password(password)
        user.save()
        user.groups.add(owner_group)

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} owner user '{username}'"))
