from decimal import Decimal

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import Group, Permission

from .models import (
    Alert,
    AutomationSettings,
    Customer,
    DailyProductionRecord,
    EggProductionStandard,
    FeedExpense,
    FeedStock,
    FeedType,
    Flock,
    IncidentCause,
    PoultryHouse,
    PurchaseRequest,
    RationPhase,
    Sale,
    FeedAutomationSettings,
)

User = get_user_model()


class BootstrapFormMixin:
    def _apply_bootstrap(self):
        for field in self.fields.values():
            widget = field.widget
            if isinstance(widget, forms.CheckboxInput):
                widget.attrs["class"] = "form-check-input"
                continue
            if isinstance(widget, forms.CheckboxSelectMultiple):
                continue
            if isinstance(widget, forms.RadioSelect):
                continue
            existing = widget.attrs.get("class", "")
            widget.attrs["class"] = f"{existing} form-control".strip()


class SmartAuthenticationForm(BootstrapFormMixin, AuthenticationForm):
    error_messages = {
        "invalid_login": "Неверный логин или пароль.",
        "inactive": "Этот аккаунт отключен.",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()
        self.fields["username"].label = "Логин"
        self.fields["password"].label = "Пароль"


class PermissionMultipleChoiceField(forms.ModelMultipleChoiceField):
    MODEL_LABELS = {
        "flock": "Стадо",
        "eggproductionstandard": "Эталон яйценоскости",
        "dailyproductionrecord": "Дневная запись",
        "alert": "Инцидент",
        "feedtype": "Тип корма",
        "feedstock": "Остаток корма",
        "rationphase": "Фаза рациона",
        "feedstockmovement": "Движение корма",
        "feedexpense": "Расход на корм",
        "feedautomationsettings": "Настройки автосписания",
        "automationsettings": "Настройки автоматизации",
        "purchaserequest": "Заявка на закупку",
        "eggprice": "Цена яйца",
        "dailyfinancesnapshot": "Финансовый снимок дня",
        "poultryhouse": "Корпус",
        "incidentcause": "Причина инцидента",
        "customer": "Клиент",
        "sale": "Продажа",
    }

    def label_from_instance(self, obj):
        action_map = {
            "view": "Просмотр",
            "add": "Создание",
            "change": "Редактирование",
            "delete": "Удаление",
        }
        parts = obj.codename.split("_", 1)
        if len(parts) == 2 and parts[0] in action_map:
            action = action_map[parts[0]]
            model_name = self.MODEL_LABELS.get(
                obj.content_type.model, obj.content_type.model.replace("_", " ").title()
            )
            return f"{model_name} — {action}"

        custom_map = {
            "view_dashboard": "Дашборд — Просмотр",
            "generate_report": "Отчеты — Генерация PDF",
            "approve_purchaserequest": "Заявки закупки — Подтверждение",
        }
        if obj.codename in custom_map:
            return custom_map[obj.codename]

        model_name = self.MODEL_LABELS.get(
            obj.content_type.model, obj.content_type.model.replace("_", " ").title()
        )
        return f"{model_name} — {obj.name}"


def _manager_permission_queryset():
    return (
        Permission.objects.filter(content_type__app_label="smartpoultry")
        .select_related("content_type")
        .order_by("content_type__model", "codename")
    )


class DailyProductionRecordForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        BootstrapFormMixin._apply_bootstrap(self)

    class Meta:
        model = DailyProductionRecord
        fields = [
            "flock",
            "record_date",
            "c0_count",
            "c1_count",
            "c2_count",
            "broken_count",
            "chipped_count",
            "mortality_count",
        ]
        labels = {
            "flock": "Стадо",
            "record_date": "Дата записи",
            "c0_count": "Яйца C0, шт",
            "c1_count": "Яйца C1, шт",
            "c2_count": "Яйца C2, шт",
            "broken_count": "Бой, шт",
            "chipped_count": "Насечка, шт",
            "mortality_count": "Падеж, шт",
        }


class ManagerCreateForm(BootstrapFormMixin, forms.ModelForm):
    password = forms.CharField(label="Пароль", widget=forms.PasswordInput)
    permissions = PermissionMultipleChoiceField(
        queryset=_manager_permission_queryset(),
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = User
        fields = ["username", "first_name", "last_name", "is_active"]
        labels = {
            "username": "Логин",
            "first_name": "Имя",
            "last_name": "Фамилия",
            "is_active": "Активен",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()
        self.fields["permissions"].label = "Доступы менеджера"

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_staff = True
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
            manager_group = Group.objects.get(name="Manager")
            user.groups.clear()
            user.groups.add(manager_group)
            user.user_permissions.set(self.cleaned_data["permissions"])
        return user


class ManagerUpdateForm(BootstrapFormMixin, forms.ModelForm):
    new_password = forms.CharField(label="Новый пароль", required=False, widget=forms.PasswordInput)
    permissions = PermissionMultipleChoiceField(
        queryset=_manager_permission_queryset(),
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    class Meta:
        model = User
        fields = ["first_name", "last_name", "is_active"]
        labels = {
            "first_name": "Имя",
            "last_name": "Фамилия",
            "is_active": "Активен",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()
        self.fields["permissions"].label = "Доступы менеджера"
        self.fields["permissions"].initial = self.instance.user_permissions.all()

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_staff = True
        new_password = self.cleaned_data.get("new_password")
        if new_password:
            user.set_password(new_password)
        if commit:
            user.save()
            manager_group = Group.objects.get(name="Manager")
            user.groups.clear()
            user.groups.add(manager_group)
            user.user_permissions.set(self.cleaned_data["permissions"])
        return user


class OwnerRegistrationForm(BootstrapFormMixin, UserCreationForm):
    class Meta:
        model = User
        fields = ("username", "first_name", "last_name")
        labels = {
            "username": "Логин",
            "first_name": "Имя",
            "last_name": "Фамилия",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()
        self.fields["password1"].label = "Пароль"
        self.fields["password2"].label = "Подтверждение пароля"

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_staff = True
        user.is_active = True
        if commit:
            user.save()
            owner_group = Group.objects.get(name="Owner")
            user.groups.add(owner_group)
        return user


class FlockForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Flock
        fields = [
            "name",
            "house",
            "batch_code",
            "cross_name",
            "placement_date",
            "initial_population",
            "is_active",
        ]
        labels = {
            "name": "Название стада",
            "house": "Корпус",
            "batch_code": "Партия",
            "cross_name": "Кросс",
            "placement_date": "Дата посадки",
            "initial_population": "Начальное поголовье",
            "is_active": "Активное стадо",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["house"].queryset = PoultryHouse.objects.filter(is_active=True).order_by("name")
        self.fields["house"].required = False
        self._apply_bootstrap()


class SetupFlockForm(FlockForm):
    pass


class SetupFeedStockForm(BootstrapFormMixin, forms.Form):
    feed_type = forms.ModelChoiceField(label="Тип корма", queryset=FeedType.objects.none())
    quantity_kg = forms.DecimalField(
        label="Стартовый остаток, кг", min_value=0, decimal_places=3
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["feed_type"].queryset = FeedType.objects.filter(is_active=True).order_by("name")
        self._apply_bootstrap()

    def save(self):
        feed_type = self.cleaned_data["feed_type"]
        quantity_kg = self.cleaned_data["quantity_kg"]
        stock, _ = FeedStock.objects.get_or_create(feed_type=feed_type)
        stock.quantity_kg = quantity_kg
        stock.save(update_fields=["quantity_kg", "updated_at"])
        return stock


class FeedIncomingForm(BootstrapFormMixin, forms.Form):
    feed_type = forms.ModelChoiceField(label="Тип корма", queryset=FeedType.objects.none())
    quantity_kg = forms.DecimalField(label="Количество, кг", min_value=Decimal("0.001"), decimal_places=3)
    note = forms.CharField(label="Комментарий", required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["feed_type"].queryset = FeedType.objects.filter(is_active=True).order_by("name")
        self._apply_bootstrap()


class FeedAdjustForm(BootstrapFormMixin, forms.Form):
    feed_type = forms.ModelChoiceField(label="Тип корма", queryset=FeedType.objects.none())
    target_quantity_kg = forms.DecimalField(
        label="Фактический остаток, кг", min_value=0, decimal_places=3
    )
    note = forms.CharField(label="Причина корректировки", required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["feed_type"].queryset = FeedType.objects.filter(is_active=True).order_by("name")
        self._apply_bootstrap()


class PurchaseReceiptForm(BootstrapFormMixin, forms.Form):
    purchase_request = forms.ModelChoiceField(
        label="Утвержденная заявка",
        queryset=PurchaseRequest.objects.none(),
    )
    received_kg = forms.DecimalField(
        label="Принято по факту, кг",
        min_value=Decimal("0.001"),
        decimal_places=3,
    )
    note = forms.CharField(label="Комментарий", required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["purchase_request"].queryset = (
            PurchaseRequest.objects.filter(status=PurchaseRequest.Status.APPROVED)
            .select_related("feed_type", "flock")
            .order_by("-created_at")
        )
        self._apply_bootstrap()

    def clean(self):
        cleaned = super().clean()
        purchase_request = cleaned.get("purchase_request")
        received_kg = cleaned.get("received_kg")
        if not purchase_request or not received_kg:
            return cleaned

        if Decimal(received_kg) > purchase_request.remaining_kg:
            self.add_error(
                "received_kg",
                f"Максимум для этой заявки: {purchase_request.remaining_kg} кг.",
            )
        return cleaned


class PurchaseRequestManualForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = PurchaseRequest
        fields = ["flock", "feed_type", "requested_kg", "note"]
        labels = {
            "flock": "Стадо",
            "feed_type": "Тип корма",
            "requested_kg": "Объем заявки, кг",
            "note": "Комментарий",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["flock"].queryset = Flock.objects.order_by("name")
        self.fields["feed_type"].queryset = FeedType.objects.filter(is_active=True).order_by("name")
        self._apply_bootstrap()


class IncidentCapaForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Alert
        fields = [
            "status",
            "cause",
            "capa_action",
            "capa_responsible",
            "capa_due_date",
        ]
        labels = {
            "status": "Статус",
            "cause": "Причина инцидента",
            "capa_action": "Корректирующие действия (CAPA)",
            "capa_responsible": "Ответственный",
            "capa_due_date": "Срок исполнения",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class PoultryHouseForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = PoultryHouse
        fields = ["name", "code", "responsible_manager", "is_active", "note"]
        labels = {
            "name": "Название корпуса",
            "code": "Код корпуса",
            "responsible_manager": "Ответственный менеджер",
            "is_active": "Активен",
            "note": "Комментарий",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["responsible_manager"].queryset = User.objects.filter(
            groups__name="Manager", is_active=True
        ).order_by("username")
        self.fields["responsible_manager"].required = False
        self._apply_bootstrap()


class IncidentCauseForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = IncidentCause
        fields = ["name", "note"]
        labels = {"name": "Причина инцидента", "note": "Комментарий"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class CustomerForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Customer
        fields = ["name", "phone", "email", "note"]
        labels = {
            "name": "Клиент",
            "phone": "Телефон",
            "email": "Email",
            "note": "Комментарий",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class SaleForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Sale
        fields = [
            "sale_date",
            "customer",
            "c0_qty",
            "c1_qty",
            "c2_qty",
            "paid_amount",
            "status",
            "note",
        ]
        labels = {
            "sale_date": "Дата продажи",
            "customer": "Клиент",
            "c0_qty": "C0, шт",
            "c1_qty": "C1, шт",
            "c2_qty": "C2, шт",
            "paid_amount": "Оплачено, ₽",
            "status": "Статус",
            "note": "Комментарий",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class SaleStatusUpdateForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = Sale
        fields = ["status"]
        labels = {"status": "Статус"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class FeedTypeForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = FeedType
        fields = ["name", "cost_per_kg", "is_active"]
        labels = {
            "name": "Название типа корма",
            "cost_per_kg": "Себестоимость, ₽/кг",
            "is_active": "Активен",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class FeedExpenseForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = FeedExpense
        fields = [
            "expense_date",
            "house",
            "flock",
            "feed_type",
            "expense_type",
            "quantity_kg",
            "amount",
            "note",
        ]
        labels = {
            "expense_date": "Дата расхода",
            "house": "Корпус",
            "flock": "Стадо",
            "feed_type": "Тип корма",
            "expense_type": "Статья расхода",
            "quantity_kg": "Количество, кг",
            "amount": "Сумма, ₽",
            "note": "Комментарий",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["house"].queryset = PoultryHouse.objects.order_by("name")
        self.fields["flock"].queryset = Flock.objects.order_by("name")
        self.fields["feed_type"].queryset = FeedType.objects.filter(is_active=True).order_by("name")
        self._apply_bootstrap()


class FeedAutomationSettingsForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = FeedAutomationSettings
        fields = ["enabled", "low_stock_days_threshold"]
        labels = {
            "enabled": "Автосписание включено",
            "low_stock_days_threshold": "Порог остатка для автозаявки, дней",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class RationPhaseForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = RationPhase
        fields = [
            "cross_name",
            "name",
            "start_week",
            "end_week",
            "daily_consumption_g",
            "feed_type",
        ]
        labels = {
            "cross_name": "Кросс",
            "name": "Фаза",
            "start_week": "С недели",
            "end_week": "По неделю",
            "daily_consumption_g": "Норма, г/гол/день",
            "feed_type": "Тип корма",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["feed_type"].queryset = FeedType.objects.filter(is_active=True).order_by("name")
        self._apply_bootstrap()


class AutomationSettingsForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = AutomationSettings
        fields = [
            "egg_drop_threshold_pct",
            "breakage_threshold_pct",
            "anomaly_egg_drop_threshold_pct",
            "anomaly_mortality_multiplier",
            "anomaly_mortality_rate_threshold_pct",
            "rotation_forecast_days",
            "rotation_min_history_days",
            "rotation_negative_margin_threshold",
            "receivable_overdue_days",
        ]
        labels = {
            "egg_drop_threshold_pct": "Порог падения яйценоскости, %",
            "breakage_threshold_pct": "Порог боя, %",
            "anomaly_egg_drop_threshold_pct": "Порог аномального падения за день, %",
            "anomaly_mortality_multiplier": "Множитель нормы падежа",
            "anomaly_mortality_rate_threshold_pct": "Порог падежа от живого поголовья, %",
            "rotation_forecast_days": "Горизонт прогноза ротации, дней",
            "rotation_min_history_days": "Минимум дней истории для прогноза",
            "rotation_negative_margin_threshold": "Порог маржинальности для сигнала, ₽",
            "receivable_overdue_days": "Срок просрочки дебиторки, дней",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class EggProductionStandardForm(BootstrapFormMixin, forms.ModelForm):
    class Meta:
        model = EggProductionStandard
        fields = ["cross_name", "week_number", "target_efficiency_percent"]
        labels = {
            "cross_name": "Кросс",
            "week_number": "Неделя возраста",
            "target_efficiency_percent": "Эталон, яиц на 100 голов/день",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()


class EggProductionStandardRangeForm(BootstrapFormMixin, forms.Form):
    cross_name = forms.CharField(label="Кросс", max_length=64)
    start_week = forms.IntegerField(label="С недели", min_value=0)
    end_week = forms.IntegerField(label="По неделю", min_value=0)
    target_efficiency_percent = forms.DecimalField(
        label="Эталон, яиц на 100 голов/день",
        min_value=0,
        max_digits=5,
        decimal_places=2,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._apply_bootstrap()

    def clean(self):
        cleaned = super().clean()
        start_week = cleaned.get("start_week")
        end_week = cleaned.get("end_week")
        if start_week is not None and end_week is not None and end_week < start_week:
            self.add_error("end_week", "Конечная неделя не может быть меньше начальной.")
        return cleaned
