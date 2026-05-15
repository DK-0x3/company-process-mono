from django.contrib import admin

from .models import (
    Alert,
    AutomationSettings,
    Customer,
    DailyFinanceSnapshot,
    DailyProductionRecord,
    EggPrice,
    EggProductionStandard,
    FeedStock,
    FeedExpense,
    FeedAutomationSettings,
    FeedStockMovement,
    FeedType,
    Flock,
    IncidentCause,
    PoultryHouse,
    PurchaseRequest,
    RationPhase,
    Sale,
)


@admin.register(Flock)
class FlockAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "house",
        "batch_code",
        "cross_name",
        "placement_date",
        "initial_population",
        "is_active",
    )
    list_filter = ("is_active", "cross_name", "house")
    search_fields = ("name", "cross_name", "batch_code", "house__name")


@admin.register(EggProductionStandard)
class EggProductionStandardAdmin(admin.ModelAdmin):
    list_display = ("cross_name", "week_number", "target_efficiency_percent")
    list_filter = ("cross_name",)
    search_fields = ("cross_name",)


@admin.register(DailyProductionRecord)
class DailyProductionRecordAdmin(admin.ModelAdmin):
    list_display = (
        "flock",
        "record_date",
        "c0_count",
        "c1_count",
        "c2_count",
        "live_population_snapshot",
        "efficiency_percent",
    )
    list_filter = ("flock", "record_date")
    date_hierarchy = "record_date"


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "alert_type",
        "severity",
        "status",
        "flock",
        "related_sale",
        "cause",
        "capa_responsible",
        "capa_due_date",
        "created_at",
    )
    list_filter = ("alert_type", "severity", "status")
    search_fields = ("title", "message", "flock__name", "cause__name", "capa_action")


@admin.register(FeedType)
class FeedTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "cost_per_kg", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(FeedStock)
class FeedStockAdmin(admin.ModelAdmin):
    list_display = ("feed_type", "quantity_kg", "updated_at")
    search_fields = ("feed_type__name",)


@admin.register(RationPhase)
class RationPhaseAdmin(admin.ModelAdmin):
    list_display = ("cross_name", "name", "start_week", "end_week", "daily_consumption_g", "feed_type")
    list_filter = ("cross_name", "feed_type")
    search_fields = ("cross_name", "name")


@admin.register(FeedAutomationSettings)
class FeedAutomationSettingsAdmin(admin.ModelAdmin):
    list_display = ("enabled", "low_stock_days_threshold", "updated_at")


@admin.register(AutomationSettings)
class AutomationSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "egg_drop_threshold_pct",
        "breakage_threshold_pct",
        "rotation_forecast_days",
        "receivable_overdue_days",
        "updated_at",
    )


@admin.register(FeedStockMovement)
class FeedStockMovementAdmin(admin.ModelAdmin):
    list_display = ("feed_type", "flock", "movement_type", "quantity_kg", "movement_date")
    list_filter = ("movement_type", "feed_type", "movement_date")
    date_hierarchy = "movement_date"


@admin.register(FeedExpense)
class FeedExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "expense_date",
        "expense_type",
        "house",
        "flock",
        "feed_type",
        "quantity_kg",
        "amount",
    )
    list_filter = ("expense_type", "house", "feed_type", "expense_date")
    search_fields = ("house__name", "flock__name", "feed_type__name", "note")
    date_hierarchy = "expense_date"


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = (
        "feed_type",
        "flock",
        "requested_kg",
        "received_kg",
        "days_to_zero",
        "status",
        "created_at",
    )
    list_filter = ("status", "feed_type")
    search_fields = ("feed_type__name", "flock__name")


@admin.register(EggPrice)
class EggPriceAdmin(admin.ModelAdmin):
    list_display = ("category", "price_per_egg")


@admin.register(DailyFinanceSnapshot)
class DailyFinanceSnapshotAdmin(admin.ModelAdmin):
    list_display = ("flock", "snapshot_date", "revenue", "feed_cost", "gross_profit")
    list_filter = ("snapshot_date", "flock")
    date_hierarchy = "snapshot_date"


@admin.register(PoultryHouse)
class PoultryHouseAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "responsible_manager", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code", "responsible_manager__username")


@admin.register(IncidentCause)
class IncidentCauseAdmin(admin.ModelAdmin):
    list_display = ("name", "note")
    search_fields = ("name",)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email")
    search_fields = ("name", "phone", "email")


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        "sale_date",
        "flock",
        "customer",
        "c0_qty",
        "c1_qty",
        "c2_qty",
        "total_amount",
        "paid_amount",
        "status",
    )
    list_filter = ("status", "sale_date", "flock__house")
    search_fields = ("customer__name", "flock__name", "flock__house__name")
    date_hierarchy = "sale_date"
