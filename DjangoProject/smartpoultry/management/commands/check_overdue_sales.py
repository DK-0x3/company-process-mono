from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from smartpoultry.models import Alert, AutomationSettings, Sale


class Command(BaseCommand):
    help = "Проверка частично оплаченных продаж и перевод в просрочку."

    def handle(self, *args, **options):
        today = timezone.localdate()
        settings = AutomationSettings.get_solo()
        cutoff = today - timedelta(days=int(settings.receivable_overdue_days))
        queryset = Sale.objects.filter(
            status=Sale.Status.PARTIAL_PAID,
            sale_date__lte=cutoff,
        )
        updated = 0
        for sale in queryset:
            sale.status = Sale.Status.OVERDUE
            sale.save(update_fields=["status", "updated_at"])
            Alert.objects.create(
                flock=sale.flock,
                related_sale=sale,
                alert_type=Alert.AlertType.RECEIVABLE_OVERDUE,
                severity=Alert.Severity.WARNING,
                status=Alert.Status.OPEN,
                title=f"Просроченная дебиторка по продаже #{sale.id}",
                message=(
                    f"Продажа от {sale.sale_date} просрочена более {settings.receivable_overdue_days} дней. "
                    "Счет на доплату доступен по кнопке в карточке инцидента."
                ),
            )
            updated += 1
        self.stdout.write(self.style.SUCCESS(f"Просроченных продаж обработано: {updated}"))
