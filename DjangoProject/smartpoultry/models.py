from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PoultryHouse(TimeStampedModel):
    name = models.CharField(max_length=128, unique=True)
    code = models.CharField(max_length=32, unique=True)
    responsible_manager = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="responsible_houses",
    )
    is_active = models.BooleanField(default=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.code})"


class Flock(TimeStampedModel):
    name = models.CharField(max_length=128)
    cross_name = models.CharField(max_length=64)
    house = models.ForeignKey(
        PoultryHouse, on_delete=models.SET_NULL, null=True, blank=True, related_name="flocks"
    )
    batch_code = models.CharField(max_length=64, blank=True)
    placement_date = models.DateField()
    initial_population = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-is_active", "name")
        permissions = (
            ("view_dashboard", "Может просматривать дашборд"),
            ("generate_report", "Может генерировать PDF-отчеты"),
        )

    def __str__(self):
        return f"{self.name} ({self.cross_name})"

    def age_in_weeks(self, date_value):
        age_days = (date_value - self.placement_date).days
        if age_days < 0:
            return 0
        return age_days // 7

    def live_population(self, date_value):
        mortality = (
            self.production_records.filter(record_date__lte=date_value)
            .aggregate(total=Sum("mortality_count"))
            .get("total")
            or 0
        )
        return max(0, self.initial_population - mortality)


class EggProductionStandard(TimeStampedModel):
    cross_name = models.CharField(max_length=64)
    week_number = models.PositiveIntegerField()
    target_efficiency_percent = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ("cross_name", "week_number")
        unique_together = ("cross_name", "week_number")

    def __str__(self):
        return f"{self.cross_name} w{self.week_number}: {self.target_efficiency_percent}%"


class EggCollectionMachine(TimeStampedModel):
    name = models.CharField(max_length=128, unique=True)
    serial_number = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.serial_number})"


class DailyProductionRecord(TimeStampedModel):
    flock = models.ForeignKey(
        Flock, on_delete=models.CASCADE, related_name="production_records"
    )
    machine = models.ForeignKey(
        EggCollectionMachine,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="production_records",
    )
    record_date = models.DateField(default=timezone.localdate)
    c0_count = models.PositiveIntegerField(default=0)
    c1_count = models.PositiveIntegerField(default=0)
    c2_count = models.PositiveIntegerField(default=0)
    broken_count = models.PositiveIntegerField(default=0)
    chipped_count = models.PositiveIntegerField(default=0)
    mortality_count = models.PositiveIntegerField(default=0)
    live_population_snapshot = models.PositiveIntegerField(default=0, editable=False)
    efficiency_percent = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("0.00"), editable=False
    )

    class Meta:
        ordering = ("-record_date",)
        unique_together = ("flock", "record_date")

    def __str__(self):
        return f"{self.flock.name} - {self.record_date}"

    @property
    def total_eggs(self):
        return self.c0_count + self.c1_count + self.c2_count

    @property
    def breakage_percent(self):
        if self.total_eggs == 0:
            return Decimal("0.00")
        return (Decimal(self.broken_count) / Decimal(self.total_eggs)) * Decimal("100")

    def calculate_live_population_snapshot(self):
        previous_mortality = (
            DailyProductionRecord.objects.filter(
                flock=self.flock,
                record_date__lte=self.record_date,
            )
            .exclude(pk=self.pk)
            .aggregate(total=Sum("mortality_count"))
            .get("total")
            or 0
        )
        return max(0, self.flock.initial_population - previous_mortality - self.mortality_count)

    def calculate_efficiency_percent(self):
        if self.live_population_snapshot <= 0:
            return Decimal("0.00")
        return (Decimal(self.total_eggs) / Decimal(self.live_population_snapshot)) * Decimal(
            "100"
        )

    def save(self, *args, **kwargs):
        self.live_population_snapshot = self.calculate_live_population_snapshot()
        self.efficiency_percent = self.calculate_efficiency_percent()
        super().save(*args, **kwargs)


class IncidentCause(TimeStampedModel):
    name = models.CharField(max_length=160, unique=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Alert(TimeStampedModel):
    class Severity(models.TextChoices):
        INFO = "info", "Инфо"
        WARNING = "warning", "Предупреждение"
        CRITICAL = "critical", "Критично"

    class AlertType(models.TextChoices):
        EGG_DROP = "egg_drop", "Падение яйценоскости"
        BREAKAGE = "breakage", "Повышенный бой"
        FEED_STOCK = "feed_stock", "Низкий остаток корма"
        PRODUCTION_ANOMALY = "production_anomaly", "Производственная аномалия"
        FLOCK_ROTATION = "flock_rotation", "Плановая замена стада"
        RECEIVABLE_OVERDUE = "receivable_overdue", "Просроченная дебиторка"

    class Status(models.TextChoices):
        OPEN = "open", "Открыт"
        RESOLVED = "resolved", "Решен"

    flock = models.ForeignKey(
        Flock, on_delete=models.CASCADE, related_name="alerts", null=True, blank=True
    )
    related_record = models.ForeignKey(
        DailyProductionRecord,
        on_delete=models.CASCADE,
        related_name="alerts",
        null=True,
        blank=True,
    )
    related_sale = models.ForeignKey(
        "Sale",
        on_delete=models.SET_NULL,
        related_name="alerts",
        null=True,
        blank=True,
    )
    alert_type = models.CharField(max_length=32, choices=AlertType.choices)
    severity = models.CharField(max_length=16, choices=Severity.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    title = models.CharField(max_length=255)
    message = models.TextField()
    cause = models.ForeignKey(
        IncidentCause, on_delete=models.SET_NULL, null=True, blank=True, related_name="alerts"
    )
    capa_action = models.TextField(blank=True)
    capa_responsible = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="capa_alerts"
    )
    capa_due_date = models.DateField(null=True, blank=True)
    capa_closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("status", "-created_at")

    def __str__(self):
        return f"{self.get_severity_display()}: {self.title}"


class FeedType(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    cost_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class FeedStock(TimeStampedModel):
    feed_type = models.OneToOneField(
        FeedType, on_delete=models.CASCADE, related_name="stock"
    )
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("0.000"))

    class Meta:
        ordering = ("feed_type__name",)

    def __str__(self):
        return f"{self.feed_type.name}: {self.quantity_kg} kg"


class RationPhase(TimeStampedModel):
    cross_name = models.CharField(max_length=64)
    name = models.CharField(max_length=64)
    start_week = models.PositiveIntegerField()
    end_week = models.PositiveIntegerField()
    daily_consumption_g = models.DecimalField(max_digits=8, decimal_places=2)
    feed_type = models.ForeignKey(
        FeedType, on_delete=models.PROTECT, related_name="ration_phases"
    )

    class Meta:
        ordering = ("cross_name", "start_week")

    def __str__(self):
        return f"{self.cross_name}: {self.name} ({self.start_week}-{self.end_week} weeks)"


class FeedAutomationSettings(TimeStampedModel):
    enabled = models.BooleanField(default=True)
    low_stock_days_threshold = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal("7.00")
    )

    class Meta:
        verbose_name = "Настройки автосписания"
        verbose_name_plural = "Настройки автосписания"

    def __str__(self):
        return "Автосписание корма"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class AutomationSettings(TimeStampedModel):
    egg_drop_threshold_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("5.00")
    )
    breakage_threshold_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("3.00")
    )
    anomaly_egg_drop_threshold_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("5.00")
    )
    anomaly_mortality_multiplier = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("1.50")
    )
    anomaly_mortality_rate_threshold_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("0.50")
    )
    rotation_forecast_days = models.PositiveIntegerField(default=14)
    rotation_min_history_days = models.PositiveIntegerField(default=5)
    rotation_negative_margin_threshold = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    receivable_overdue_days = models.PositiveIntegerField(default=7)

    class Meta:
        verbose_name = "Настройки автоматизации"
        verbose_name_plural = "Настройки автоматизации"

    def __str__(self):
        return "Пороги и правила автоматизации"

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class FeedStockMovement(TimeStampedModel):
    class MovementType(models.TextChoices):
        IN = "in", "Приход"
        OUT = "out", "Списание"
        ADJUST = "adjust", "Корректировка"

    feed_type = models.ForeignKey(
        FeedType, on_delete=models.PROTECT, related_name="movements"
    )
    flock = models.ForeignKey(
        Flock, on_delete=models.SET_NULL, null=True, blank=True, related_name="feed_movements"
    )
    movement_type = models.CharField(max_length=16, choices=MovementType.choices)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=3)
    movement_date = models.DateField(default=timezone.localdate)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-movement_date", "-created_at")

    def __str__(self):
        return f"{self.feed_type.name} {self.movement_type} {self.quantity_kg} kg"


class FeedExpense(TimeStampedModel):
    class ExpenseType(models.TextChoices):
        FEED_PURCHASE = "feed_purchase", "Закупка корма"
        TRANSPORT = "transport", "Доставка/логистика"
        SUPPLEMENT = "supplement", "Добавки/премиксы"
        OTHER = "other", "Прочее"

    expense_date = models.DateField(default=timezone.localdate)
    house = models.ForeignKey(
        PoultryHouse,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feed_expenses",
    )
    flock = models.ForeignKey(
        Flock,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feed_expenses",
    )
    feed_type = models.ForeignKey(
        FeedType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feed_expenses",
    )
    expense_type = models.CharField(max_length=32, choices=ExpenseType.choices)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("0.000"))
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-expense_date", "-created_at")

    def __str__(self):
        return f"{self.get_expense_type_display()} {self.amount} ({self.expense_date})"


class PurchaseRequest(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Ожидает подтверждения"
        APPROVED = "approved", "Утверждена"
        FULFILLED = "fulfilled", "Исполнена"
        REJECTED = "rejected", "Отклонена"

    flock = models.ForeignKey(
        Flock, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_requests"
    )
    feed_type = models.ForeignKey(
        FeedType, on_delete=models.PROTECT, related_name="purchase_requests"
    )
    requested_kg = models.DecimalField(max_digits=12, decimal_places=3)
    received_kg = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("0.000"))
    days_to_zero = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("status", "-created_at")
        permissions = (("approve_purchaserequest", "Может подтверждать заявку на закупку"),)

    def __str__(self):
        return f"{self.feed_type.name}: {self.requested_kg} kg ({self.get_status_display()})"

    @property
    def remaining_kg(self):
        return max(Decimal("0.000"), Decimal(self.requested_kg) - Decimal(self.received_kg))


class EggPrice(TimeStampedModel):
    class EggCategory(models.TextChoices):
        C0 = "c0", "C0"
        C1 = "c1", "C1"
        C2 = "c2", "C2"

    category = models.CharField(max_length=8, choices=EggCategory.choices, unique=True)
    price_per_egg = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ("category",)

    def __str__(self):
        return f"{self.get_category_display()}: {self.price_per_egg}"


class Customer(TimeStampedModel):
    name = models.CharField(max_length=160, unique=True)
    phone = models.CharField(max_length=64, blank=True)
    email = models.EmailField(blank=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Sale(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "Новая"
        IN_PROGRESS = "in_progress", "В работе"
        PARTIAL_PAID = "partial_paid", "Частично оплачена"
        OVERDUE = "overdue", "Просрочка"
        COMPLETED = "completed", "Завершена"
        CANCELED = "canceled", "Отменена"

    sale_date = models.DateField(default=timezone.localdate)
    flock = models.ForeignKey(
        Flock, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales"
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales"
    )
    c0_qty = models.PositiveIntegerField(default=0)
    c1_qty = models.PositiveIntegerField(default=0)
    c2_qty = models.PositiveIntegerField(default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ("-sale_date", "-created_at")

    def __str__(self):
        return f"Продажа {self.sale_date}: {self.total_amount}"

    @property
    def receivable_amount(self):
        return max(Decimal("0.00"), Decimal(self.total_amount) - Decimal(self.paid_amount))

    def calculate_total(self):
        prices = {
            item.category: item.price_per_egg
            for item in EggPrice.objects.filter(
                category__in=[
                    EggPrice.EggCategory.C0,
                    EggPrice.EggCategory.C1,
                    EggPrice.EggCategory.C2,
                ]
            )
        }
        total = (
            Decimal(self.c0_qty) * Decimal(prices.get(EggPrice.EggCategory.C0, Decimal("0.00")))
            + Decimal(self.c1_qty) * Decimal(prices.get(EggPrice.EggCategory.C1, Decimal("0.00")))
            + Decimal(self.c2_qty) * Decimal(prices.get(EggPrice.EggCategory.C2, Decimal("0.00")))
        )
        return total.quantize(Decimal("0.01"))

    def save(self, *args, **kwargs):
        self.total_amount = self.calculate_total()
        super().save(*args, **kwargs)


class DailyFinanceSnapshot(TimeStampedModel):
    flock = models.ForeignKey(
        Flock, on_delete=models.CASCADE, related_name="finance_snapshots"
    )
    snapshot_date = models.DateField(default=timezone.localdate)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    feed_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ("-snapshot_date",)
        unique_together = ("flock", "snapshot_date")

    def __str__(self):
        return f"{self.flock.name} {self.snapshot_date}: {self.gross_profit}"
