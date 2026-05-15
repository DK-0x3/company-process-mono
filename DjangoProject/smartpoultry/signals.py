from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import DailyProductionRecord
from .services import (
    process_daily_finance,
    process_feed_consumption,
    process_predictive_flock_rotation,
    process_production_alerts,
)


@receiver(post_save, sender=DailyProductionRecord)
def process_daily_record(sender, instance, **kwargs):
    process_production_alerts(instance)
    process_feed_consumption(instance)
    process_daily_finance(instance)
    process_predictive_flock_rotation(instance)
