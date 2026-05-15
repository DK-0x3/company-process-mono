from django.core.management.base import BaseCommand

from smartpoultry.services import seed_reference_data


class Command(BaseCommand):
    help = "Seed reference data: feed types, ration phases, egg prices, efficiency standards."

    def add_arguments(self, parser):
        parser.add_argument(
            "--cross",
            default="Lohmann",
            help="Cross name to seed standards and ration phases for (default: Lohmann).",
        )

    def handle(self, *args, **options):
        cross_name = options["cross"]
        seed_reference_data(cross_name=cross_name)
        self.stdout.write(
            self.style.SUCCESS(
                f"Reference data seeded successfully for cross '{cross_name}'."
            )
        )
