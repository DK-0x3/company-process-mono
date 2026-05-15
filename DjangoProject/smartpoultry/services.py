from datetime import timedelta
from decimal import Decimal
from typing import Optional

from django.db.models import Avg, Sum

from .models import (
    Alert,
    AutomationSettings,
    DailyFinanceSnapshot,
    DailyProductionRecord,
    EggPrice,
    EggProductionStandard,
    FeedStock,
    FeedStockMovement,
    FeedType,
    FeedAutomationSettings,
    PurchaseRequest,
    RationPhase,
)


def get_expected_efficiency_for_flock(flock, date_value) -> Decimal:
    week = flock.age_in_weeks(date_value)
    standards = EggProductionStandard.objects.filter(
        cross_name__iexact=flock.cross_name
    ).order_by("week_number")
    if not standards.exists():
        return Decimal("0.00")

    exact = standards.filter(week_number=week).first()
    if exact:
        return exact.target_efficiency_percent

    fallback = standards.filter(week_number__lte=week).order_by("-week_number").first()
    if fallback:
        return fallback.target_efficiency_percent

    first_item = standards.first()
    return first_item.target_efficiency_percent if first_item else Decimal("0.00")


def get_expected_efficiency_percent(record: DailyProductionRecord) -> Decimal:
    return get_expected_efficiency_for_flock(record.flock, record.record_date)


def _upsert_alert(
    *,
    record: DailyProductionRecord,
    alert_type: str,
    should_open: bool,
    severity: str,
    title: str,
    message: str,
):
    alert = Alert.objects.filter(
        flock=record.flock,
        related_record=record,
        alert_type=alert_type,
    ).first()
    if should_open:
        if not alert:
            alert = Alert(
                flock=record.flock,
                related_record=record,
                alert_type=alert_type,
            )
        alert.severity = severity
        alert.status = Alert.Status.OPEN
        alert.title = title
        alert.message = message
        alert.save()
        return

    if alert and alert.status != Alert.Status.RESOLVED:
        alert.status = Alert.Status.RESOLVED
        alert.save(update_fields=["status", "updated_at"])


def _upsert_flock_alert(
    *,
    flock,
    alert_type: str,
    should_open: bool,
    severity: str,
    title: str,
    message: str,
    related_record: Optional[DailyProductionRecord] = None,
):
    alert = Alert.objects.filter(
        flock=flock,
        alert_type=alert_type,
        status=Alert.Status.OPEN,
    ).order_by("-created_at").first()
    if should_open:
        if not alert:
            alert = Alert(flock=flock, alert_type=alert_type)
        alert.related_record = related_record
        alert.severity = severity
        alert.status = Alert.Status.OPEN
        alert.title = title
        alert.message = message
        alert.save()
        return

    if alert:
        alert.status = Alert.Status.RESOLVED
        alert.save(update_fields=["status", "updated_at"])


def process_production_alerts(record: DailyProductionRecord):
    settings = AutomationSettings.get_solo()
    expected = get_expected_efficiency_percent(record)
    actual = record.efficiency_percent
    drop_is_critical = expected > 0 and actual <= (
        expected - Decimal(settings.egg_drop_threshold_pct)
    )
    _upsert_alert(
        record=record,
        alert_type=Alert.AlertType.EGG_DROP,
        should_open=drop_is_critical,
        severity=Alert.Severity.CRITICAL,
        title="Критическое падение яйценоскости",
        message=(
            f"Эффективность {actual:.2f}% ниже эталона {expected:.2f}% "
            f"на {settings.egg_drop_threshold_pct}% и более. Проверьте здоровье птицы и факторы стресса."
        ),
    )

    previous = list(
        DailyProductionRecord.objects.filter(
            flock=record.flock, record_date__lt=record.record_date
        ).order_by("-record_date")[:5]
    )
    anomaly_drop = False
    anomaly_mortality = False
    avg_eggs = Decimal("0.00")
    avg_mortality = Decimal("0.00")
    if previous:
        avg_eggs = (
            Decimal(sum(item.total_eggs for item in previous)) / Decimal(len(previous))
        ).quantize(Decimal("0.01"))
        avg_mortality = (
            Decimal(sum(item.mortality_count for item in previous)) / Decimal(len(previous))
        ).quantize(Decimal("0.01"))
        anomaly_drop_limit = Decimal("1.00") - (
            Decimal(settings.anomaly_egg_drop_threshold_pct) / Decimal("100.00")
        )
        anomaly_drop = avg_eggs > 0 and Decimal(record.total_eggs) < (
            avg_eggs * anomaly_drop_limit
        )
        mortality_limit = max(
            Decimal("3.00"),
            avg_mortality * Decimal(settings.anomaly_mortality_multiplier),
        )
        mortality_rate = (
            Decimal(record.mortality_count)
            / Decimal(max(record.live_population_snapshot, 1))
            * Decimal("100")
        ).quantize(Decimal("0.01"))
        anomaly_mortality = (
            Decimal(record.mortality_count) > mortality_limit
            or mortality_rate > Decimal(settings.anomaly_mortality_rate_threshold_pct)
        )

    has_anomaly = anomaly_drop or anomaly_mortality
    parts = []
    if anomaly_drop:
        parts.append(
            f"Сбор яиц {record.total_eggs} ниже скользящей средней {avg_eggs} более чем на {settings.anomaly_egg_drop_threshold_pct}%."
        )
    if anomaly_mortality:
        parts.append(
            f"Падеж {record.mortality_count} выше нормы (средняя {avg_mortality}, порог >50% или >0.5% от живого поголовья)."
        )
    _upsert_flock_alert(
        flock=record.flock,
        alert_type=Alert.AlertType.PRODUCTION_ANOMALY,
        should_open=has_anomaly,
        severity=Alert.Severity.CRITICAL,
        title="Аномалия производственных показателей",
        message=" ".join(parts) if parts else "Отклонений от нормы не обнаружено.",
        related_record=record,
    )

    breakage = record.breakage_percent.quantize(Decimal("0.01"))
    breakage_is_high = breakage > Decimal(settings.breakage_threshold_pct)
    _upsert_alert(
        record=record,
        alert_type=Alert.AlertType.BREAKAGE,
        should_open=breakage_is_high,
        severity=Alert.Severity.WARNING,
        title="Превышен порог боя",
        message=(
            f"Процент боя {breakage}% (порог {settings.breakage_threshold_pct}%). Рекомендация: проверить настройки "
            "линии яйцесбора и скорректировать рацион (добавить кальций)."
        ),
    )


def get_ration_phase(record: DailyProductionRecord):
    week = record.flock.age_in_weeks(record.record_date)
    return RationPhase.objects.filter(
        cross_name=record.flock.cross_name, start_week__lte=week, end_week__gte=week
    ).first()


def _get_days_to_zero(feed_type, reference_date):
    stock = FeedStock.objects.filter(feed_type=feed_type).first()
    if not stock or stock.quantity_kg <= 0:
        return Decimal("0.00")

    avg_out = (
        FeedStockMovement.objects.filter(
            feed_type=feed_type,
            movement_type=FeedStockMovement.MovementType.OUT,
            movement_date__gte=reference_date - timedelta(days=2),
            movement_date__lte=reference_date,
        )
        .aggregate(avg=Avg("quantity_kg"))
        .get("avg")
        or Decimal("0.00")
    )
    if avg_out <= 0:
        return Decimal("999.00")
    return (Decimal(stock.quantity_kg) / Decimal(avg_out)).quantize(Decimal("0.01"))


def process_feed_consumption(record: DailyProductionRecord):
    settings = FeedAutomationSettings.get_solo()
    if not settings.enabled:
        return

    phase = get_ration_phase(record)
    if not phase:
        return

    consumption_kg = (
        Decimal(record.live_population_snapshot) * Decimal(phase.daily_consumption_g)
    ) / Decimal("1000")
    consumption_kg = consumption_kg.quantize(Decimal("0.001"))
    if consumption_kg <= 0:
        return

    stock, _ = FeedStock.objects.get_or_create(feed_type=phase.feed_type)
    movement = FeedStockMovement.objects.filter(
        feed_type=phase.feed_type,
        flock=record.flock,
        movement_type=FeedStockMovement.MovementType.OUT,
        movement_date=record.record_date,
        note=f"Автосписание корма для {record.flock.name}",
    ).first()

    if movement:
        delta = consumption_kg - Decimal(movement.quantity_kg)
        stock.quantity_kg = max(Decimal("0.000"), Decimal(stock.quantity_kg) - delta)
        stock.save(update_fields=["quantity_kg", "updated_at"])
        if delta != 0:
            movement.quantity_kg = consumption_kg
            movement.save(update_fields=["quantity_kg", "updated_at"])
    else:
        stock.quantity_kg = max(Decimal("0.000"), Decimal(stock.quantity_kg) - consumption_kg)
        stock.save(update_fields=["quantity_kg", "updated_at"])
        FeedStockMovement.objects.create(
            feed_type=phase.feed_type,
            flock=record.flock,
            movement_type=FeedStockMovement.MovementType.OUT,
            quantity_kg=consumption_kg,
            movement_date=record.record_date,
            note=f"Автосписание корма для {record.flock.name}",
        )

    days_to_zero = _get_days_to_zero(phase.feed_type, record.record_date)
    if days_to_zero < Decimal(settings.low_stock_days_threshold):
        pending_exists = PurchaseRequest.objects.filter(
            flock=record.flock,
            feed_type=phase.feed_type,
            status=PurchaseRequest.Status.PENDING,
        ).exists()
        if not pending_exists:
            recent_out = (
                FeedStockMovement.objects.filter(
                    feed_type=phase.feed_type,
                    movement_type=FeedStockMovement.MovementType.OUT,
                    movement_date__gte=record.record_date - timedelta(days=2),
                    movement_date__lte=record.record_date,
                )
                .aggregate(total=Sum("quantity_kg"))
                .get("total")
                or Decimal("0.00")
            )
            request_kg = max(Decimal("100.000"), (recent_out * Decimal("7.00")))
            PurchaseRequest.objects.create(
                flock=record.flock,
                feed_type=phase.feed_type,
                requested_kg=request_kg.quantize(Decimal("0.001")),
                days_to_zero=days_to_zero,
                note="Автозаявка: прогноз низкого остатка корма",
            )
            Alert.objects.create(
                flock=record.flock,
                related_record=record,
                alert_type=Alert.AlertType.FEED_STOCK,
                severity=Alert.Severity.WARNING,
                status=Alert.Status.OPEN,
                title="Прогноз: низкий остаток корма",
                message=(
                    f"Корма {phase.feed_type.name} осталось менее чем на 7 дней "
                    f"(осталось {days_to_zero} дней). Создана заявка на закупку."
                ),
            )


def process_daily_finance(record: DailyProductionRecord):
    prices = {
        item.category: item.price_per_egg
        for item in EggPrice.objects.filter(
            category__in=[EggPrice.EggCategory.C0, EggPrice.EggCategory.C1, EggPrice.EggCategory.C2]
        )
    }
    revenue = (
        Decimal(record.c0_count) * Decimal(prices.get(EggPrice.EggCategory.C0, Decimal("0.00")))
        + Decimal(record.c1_count)
        * Decimal(prices.get(EggPrice.EggCategory.C1, Decimal("0.00")))
        + Decimal(record.c2_count)
        * Decimal(prices.get(EggPrice.EggCategory.C2, Decimal("0.00")))
    )

    daily_feed_out = FeedStockMovement.objects.filter(
        flock=record.flock,
        movement_type=FeedStockMovement.MovementType.OUT,
        movement_date=record.record_date,
    )
    feed_cost = Decimal("0.00")
    for movement in daily_feed_out:
        feed_cost += Decimal(movement.quantity_kg) * Decimal(movement.feed_type.cost_per_kg)

    snapshot, _ = DailyFinanceSnapshot.objects.get_or_create(
        flock=record.flock, snapshot_date=record.record_date
    )
    snapshot.revenue = revenue.quantize(Decimal("0.01"))
    snapshot.feed_cost = feed_cost.quantize(Decimal("0.01"))
    snapshot.gross_profit = (snapshot.revenue - snapshot.feed_cost).quantize(Decimal("0.01"))
    snapshot.save()


def process_predictive_flock_rotation(record: DailyProductionRecord):
    settings = AutomationSettings.get_solo()
    history = list(
        DailyFinanceSnapshot.objects.filter(flock=record.flock)
        .order_by("-snapshot_date")[:14]
    )
    if len(history) < int(settings.rotation_min_history_days):
        return
    history.reverse()
    first = history[0]
    last = history[-1]
    days = max((last.snapshot_date - first.snapshot_date).days, 1)
    slope = (Decimal(last.gross_profit) - Decimal(first.gross_profit)) / Decimal(days)
    forecast_days = int(settings.rotation_forecast_days)
    forecast_profit = Decimal(last.gross_profit) + slope * Decimal(forecast_days)
    should_open = forecast_profit < Decimal(settings.rotation_negative_margin_threshold)
    due_date = record.record_date + timedelta(days=forecast_days)
    _upsert_flock_alert(
        flock=record.flock,
        alert_type=Alert.AlertType.FLOCK_ROTATION,
        should_open=should_open,
        severity=Alert.Severity.WARNING,
        title="Рекомендована плановая замена стада",
        message=(
            f"Тренд маржинальности указывает на риск отрицательной прибыли через {forecast_days} дней. "
            f"Рекомендуемая дата плановой замены: {due_date}."
        ),
        related_record=record,
    )


def seed_reference_data(cross_name: str = "Lohmann"):
    starter_feed = FeedType.objects.filter(name__in=["Старт", "Starter"]).first()
    if starter_feed:
        if starter_feed.name != "Старт":
            starter_feed.name = "Старт"
    else:
        starter_feed = FeedType(name="Старт")
    if starter_feed.cost_per_kg <= 0:
        starter_feed.cost_per_kg = Decimal("18.00")
    starter_feed.is_active = True
    starter_feed.save()

    layer_feed = FeedType.objects.filter(name__in=["Несушка", "Layer"]).first()
    if layer_feed:
        if layer_feed.name != "Несушка":
            layer_feed.name = "Несушка"
    else:
        layer_feed = FeedType(name="Несушка")
    if layer_feed.cost_per_kg <= 0:
        layer_feed.cost_per_kg = Decimal("22.00")
    layer_feed.is_active = True
    layer_feed.save()

    RationPhase.objects.update_or_create(
        cross_name=cross_name,
        name="Фаза старта",
        defaults={
            "start_week": 0,
            "end_week": 19,
            "daily_consumption_g": Decimal("90.00"),
            "feed_type": starter_feed,
        },
    )
    RationPhase.objects.update_or_create(
        cross_name=cross_name,
        name="Фаза несушки",
        defaults={
            "start_week": 20,
            "end_week": 80,
            "daily_consumption_g": Decimal("115.00"),
            "feed_type": layer_feed,
        },
    )

    EggPrice.objects.update_or_create(
        category=EggPrice.EggCategory.C0, defaults={"price_per_egg": Decimal("12.00")}
    )
    EggPrice.objects.update_or_create(
        category=EggPrice.EggCategory.C1, defaults={"price_per_egg": Decimal("10.00")}
    )
    EggPrice.objects.update_or_create(
        category=EggPrice.EggCategory.C2, defaults={"price_per_egg": Decimal("8.00")}
    )

    # Base reference curve for layers from 18 to 80 weeks.
    for week in range(18, 81):
        if week < 24:
            target = Decimal("60.00") + Decimal(week - 18) * Decimal("5.50")
        elif week < 50:
            target = Decimal("92.00")
        elif week < 65:
            target = Decimal("90.00") - Decimal(week - 50) * Decimal("0.40")
        else:
            target = Decimal("84.00") - Decimal(week - 65) * Decimal("0.35")
        target = max(Decimal("55.00"), min(Decimal("95.00"), target)).quantize(
            Decimal("0.01")
        )
        EggProductionStandard.objects.update_or_create(
            cross_name=cross_name,
            week_number=week,
            defaults={"target_efficiency_percent": target},
        )


def get_feed_days_to_zero(feed_type, reference_date):
    return _get_days_to_zero(feed_type, reference_date)


def get_feed_days_to_zero_snapshot(reference_date):
    result = {}
    for stock in FeedStock.objects.select_related("feed_type"):
        result[stock.feed_type.name] = float(
            _get_days_to_zero(stock.feed_type, reference_date)
        )
    return result
