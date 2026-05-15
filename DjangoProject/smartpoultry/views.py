from datetime import timedelta
from io import BytesIO
from decimal import Decimal
from collections import defaultdict
from pathlib import Path
import re
from urllib.parse import unquote
import csv

from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.views import LoginView
from django.db.models import Avg, Sum, Case, When, IntegerField, Value
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.urls import reverse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .forms import (
    AutomationSettingsForm,
    CustomerForm,
    DailyProductionRecordForm,
    EggProductionStandardForm,
    EggProductionStandardRangeForm,
    FeedAutomationSettingsForm,
    FeedExpenseForm,
    FeedAdjustForm,
    FeedIncomingForm,
    FeedTypeForm,
    IncidentCapaForm,
    IncidentCauseForm,
    ManagerCreateForm,
    ManagerUpdateForm,
    OwnerRegistrationForm,
    PoultryHouseForm,
    PurchaseRequestManualForm,
    PurchaseReceiptForm,
    RationPhaseForm,
    SaleForm,
    SaleStatusUpdateForm,
    SetupFeedStockForm,
    SetupFlockForm,
    SmartAuthenticationForm,
)
from .models import (
    Alert,
    AutomationSettings,
    Customer,
    DailyFinanceSnapshot,
    FeedExpense,
    DailyProductionRecord,
    EggProductionStandard,
    FeedStock,
    FeedStockMovement,
    FeedType,
    FeedAutomationSettings,
    Flock,
    IncidentCause,
    PoultryHouse,
    PurchaseRequest,
    RationPhase,
    Sale,
)
from .services import (
    get_expected_efficiency_percent,
    get_expected_efficiency_for_flock,
    get_feed_days_to_zero,
    get_feed_days_to_zero_snapshot,
    seed_reference_data,
)

User = get_user_model()
PDF_FONT_NAME = "SmartPoultryFont"
PDF_BOLD_FONT_NAME = "SmartPoultryFontBold"
_PDF_FONT_READY = False


def is_owner(user):
    return user.is_authenticated and (
        user.is_superuser or user.groups.filter(name="Owner").exists()
    )


def owner_exists():
    return User.objects.filter(groups__name="Owner").exists() or User.objects.filter(
        is_superuser=True
    ).exists()


def can_approve_purchase_requests(user):
    return user.is_authenticated and (
        is_owner(user) or user.has_perm("smartpoultry.approve_purchaserequest")
    )


def can_manage_alerts(user):
    return user.is_authenticated and (is_owner(user) or user.has_perm("smartpoultry.change_alert"))


class SmartLoginView(LoginView):
    template_name = "registration/login.html"
    authentication_form = SmartAuthenticationForm

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["allow_owner_registration"] = not owner_exists()
        return context

    def get_success_url(self):
        user = self.request.user
        if is_owner(user) or user.has_perm("smartpoultry.view_dashboard"):
            return "/"
        if user.has_perm("smartpoultry.add_dailyproductionrecord"):
            return "/records/new/"
        if user.has_perm("smartpoultry.view_feedstock") or user.has_perm(
            "smartpoultry.add_feedstockmovement"
        ):
            return "/warehouse/"
        if user.has_perm("smartpoultry.view_purchaserequest"):
            return "/purchase-requests/"
        messages.warning(
            self.request,
            "Вход выполнен, но для аккаунта не выданы рабочие доступы. Обратитесь к владельцу.",
        )
        return "/login/"


def owner_register(request):
    if owner_exists():
        messages.error(
            request,
            "Регистрация владельца отключена: владелец уже создан. Используйте страницу входа.",
        )
        return redirect("login")

    if request.method == "POST":
        form = OwnerRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Владелец создан. Добро пожаловать в SmartPoultry.")
            return redirect("dashboard")
    else:
        form = OwnerRegistrationForm()
    return render(request, "registration/register_owner.html", {"form": form})


def malformed_login_redirect(request, encoded_next=""):
    candidate = unquote(encoded_next or "")
    for _ in range(2):
        if candidate.lower().startswith("%3f"):
            candidate = unquote(candidate)
    if not candidate.startswith("?next="):
        return redirect("login")

    next_path = unquote(candidate[len("?next="):] or "/")
    if not next_path.startswith("/"):
        next_path = f"/{next_path}"
    return redirect(f"{reverse('login')}?next={next_path}")


def _ensure_pdf_fonts():
    global _PDF_FONT_READY
    if _PDF_FONT_READY:
        return PDF_FONT_NAME, PDF_BOLD_FONT_NAME

    base_dir = Path(__file__).resolve().parent.parent
    candidates_regular = [
        base_dir / "assets" / "fonts" / "DejaVuSans.ttf",
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/dejavu/DejaVuSans.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    ]
    candidates_bold = [
        base_dir / "assets" / "fonts" / "DejaVuSans-Bold.ttf",
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
        Path("/Library/Fonts/Arial Bold.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ]

    regular_path = next((p for p in candidates_regular if p.exists()), None)
    bold_path = next((p for p in candidates_bold if p.exists()), None)

    if regular_path:
        pdfmetrics.registerFont(TTFont(PDF_FONT_NAME, str(regular_path)))
        if bold_path:
            pdfmetrics.registerFont(TTFont(PDF_BOLD_FONT_NAME, str(bold_path)))
        else:
            PDF_BOLD_FONT_NAME_ALIAS = f"{PDF_FONT_NAME}_BoldAlias"
            pdfmetrics.registerFont(TTFont(PDF_BOLD_FONT_NAME_ALIAS, str(regular_path)))
            _PDF_FONT_READY = True
            return PDF_FONT_NAME, PDF_BOLD_FONT_NAME_ALIAS
        _PDF_FONT_READY = True
        return PDF_FONT_NAME, PDF_BOLD_FONT_NAME

    # fallback without Cyrillic guarantees
    _PDF_FONT_READY = True
    return "Helvetica", "Helvetica-Bold"


def _build_pdf_table_response(title, filename, headers, rows, subtitle=None):
    font_name, bold_font = _ensure_pdf_fonts()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=title,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading2"],
        fontName=bold_font,
        fontSize=14,
        leading=18,
        spaceAfter=6,
    )
    text_style = ParagraphStyle(
        "TextStyle",
        parent=styles["BodyText"],
        fontName=font_name,
        fontSize=9,
        leading=12,
    )

    table_data = [[Paragraph(f"<b>{h}</b>", text_style) for h in headers]]
    for row in rows:
        table_data.append([Paragraph(str(cell), text_style) for cell in row])

    table = Table(table_data, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5E7EB")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, 0), bold_font),
                ("FONTNAME", (0, 1), (-1, -1), font_name),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]
        )
    )

    elements = [Paragraph(title, title_style)]
    if subtitle:
        elements.append(Paragraph(subtitle, text_style))
        elements.append(Spacer(1, 4 * mm))
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return HttpResponse(
        buffer.getvalue(),
        content_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _build_overdue_notice_pdf_response(sale):
    debt = sale.receivable_amount
    rows = [
        ["Дата формирования", timezone.localtime().strftime("%d.%m.%Y %H:%M")],
        ["Продажа", f"#{sale.id} от {sale.sale_date.strftime('%d.%m.%Y')}"],
        ["Клиент", sale.customer.name if sale.customer else "-"],
        ["Статус продажи", sale.get_status_display()],
        ["Сумма продажи", f"{sale.total_amount} руб."],
        ["Оплачено", f"{sale.paid_amount} руб."],
        ["К доплате", f"{debt} руб."],
        ["Комментарий", "Просим закрыть задолженность в ближайшее время."],
    ]
    return _build_pdf_table_response(
        title="SmartPoultry - Уведомление о доплате",
        filename=f"overdue_sale_{sale.id}_{timezone.localdate()}.pdf",
        headers=["Поле", "Значение"],
        rows=rows,
        subtitle="Документ сформирован по инциденту просроченной дебиторки",
    )


def _get_sale_for_overdue_incident(incident):
    if incident.related_sale_id:
        return incident.related_sale
    if incident.alert_type != Alert.AlertType.RECEIVABLE_OVERDUE:
        return None
    # Поддержка старых инцидентов без связи с продажей.
    match = re.search(r"#(\d+)", incident.title or "")
    if not match:
        return None
    try:
        return Sale.objects.select_related("customer").get(id=int(match.group(1)))
    except Sale.DoesNotExist:
        return None


def _parse_date(date_str):
    if not date_str:
        return None
    try:
        return timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


@login_required
def dashboard(request):
    if not request.user.has_perm("smartpoultry.view_dashboard") and not is_owner(request.user):
        return HttpResponseForbidden("Недостаточно прав для просмотра дашборда.")

    today = timezone.localdate()
    week_start = today - timedelta(days=6)

    active_houses = PoultryHouse.objects.filter(is_active=True).count()
    active_flocks = Flock.objects.filter(is_active=True).count()
    live_population = sum(flock.live_population(today) for flock in Flock.objects.filter(is_active=True))
    week_totals = DailyProductionRecord.objects.filter(record_date__range=[week_start, today]).aggregate(
        c0=Sum("c0_count"),
        c1=Sum("c1_count"),
        c2=Sum("c2_count"),
    )
    week_eggs = (week_totals.get("c0") or 0) + (week_totals.get("c1") or 0) + (
        week_totals.get("c2") or 0
    )
    open_alerts = Alert.objects.filter(status=Alert.Status.OPEN).count()
    daily_profit = (
        DailyFinanceSnapshot.objects.filter(snapshot_date=today)
        .aggregate(total=Sum("gross_profit"))
        .get("total")
        or 0
    )
    daily_sales = (
        Sale.objects.filter(sale_date=today).aggregate(total=Sum("total_amount")).get("total") or 0
    )
    totals = Sale.objects.aggregate(total_amount=Sum("total_amount"), paid_amount=Sum("paid_amount"))
    receivable_total = (totals.get("total_amount") or 0) - (totals.get("paid_amount") or 0)
    latest_alerts = Alert.objects.select_related("flock").order_by("-created_at")[:10]
    feed_stocks = FeedStock.objects.select_related("feed_type").order_by("feed_type__name")
    feed_days_map = get_feed_days_to_zero_snapshot(today)
    feed_stock_rows = [
        {
            "name": stock.feed_type.name,
            "quantity_kg": stock.quantity_kg,
            "days_to_zero": round(feed_days_map.get(stock.feed_type.name, 0), 2),
        }
        for stock in feed_stocks
    ]

    # Charts: last 14 days efficiency vs standard, gross profit trend, and feed stock days left.
    chart_start = today - timedelta(days=13)
    records_window = list(
        DailyProductionRecord.objects.filter(
            record_date__range=[chart_start, today]
        ).select_related("flock")
    )
    records_by_date = defaultdict(list)
    for item in records_window:
        records_by_date[item.record_date].append(item)

    chart_labels = []
    efficiency_actual = []
    efficiency_standard = []
    for offset in range(14):
        day = chart_start + timedelta(days=offset)
        chart_labels.append(day.strftime("%d.%m"))
        day_records = records_by_date.get(day, [])
        if not day_records:
            efficiency_actual.append(0)
            efficiency_standard.append(0)
            continue
        total_eggs = sum(r.total_eggs for r in day_records)
        total_live = sum(r.live_population_snapshot for r in day_records)
        actual = round((total_eggs / total_live * 100), 2) if total_live else 0
        expected_values = [float(get_expected_efficiency_percent(r)) for r in day_records]
        expected = round(sum(expected_values) / len(expected_values), 2) if expected_values else 0
        efficiency_actual.append(actual)
        efficiency_standard.append(expected)

    today_records = records_by_date.get(today, [])
    if today_records:
        today_total_eggs = sum(r.total_eggs for r in today_records)
        today_total_live = sum(r.live_population_snapshot for r in today_records)
        overall_eff_today = round((today_total_eggs / today_total_live * 100), 2) if today_total_live else 0
        expected_today_values = [float(get_expected_efficiency_percent(r)) for r in today_records]
        overall_standard_today = (
            round(sum(expected_today_values) / len(expected_today_values), 2) if expected_today_values else 0
        )
    else:
        overall_eff_today = 0
        overall_standard_today = 0

    finance_rows = {
        row["snapshot_date"]: float(row["total"] or 0)
        for row in DailyFinanceSnapshot.objects.filter(
            snapshot_date__range=[chart_start, today]
        )
        .values("snapshot_date")
        .annotate(total=Sum("gross_profit"))
    }
    finance_profit = [
        round(finance_rows.get(chart_start + timedelta(days=offset), 0), 2)
        for offset in range(14)
    ]
    feed_days_labels = list(feed_days_map.keys())
    feed_days_values = [round(value, 2) for value in feed_days_map.values()]
    sales_rows = {
        row["sale_date"]: float(row["total"] or 0)
        for row in Sale.objects.filter(sale_date__range=[chart_start, today])
        .values("sale_date")
        .annotate(total=Sum("total_amount"))
    }
    sales_trend = [
        round(sales_rows.get(chart_start + timedelta(days=offset), 0), 2) for offset in range(14)
    ]

    context = {
        "active_houses": active_houses,
        "active_flocks": active_flocks,
        "live_population": live_population,
        "week_eggs": week_eggs,
        "open_alerts": open_alerts,
        "daily_profit": daily_profit,
        "daily_sales": daily_sales,
        "receivable_total": receivable_total,
        "latest_alerts": latest_alerts,
        "feed_stocks": feed_stocks,
        "feed_stock_rows": feed_stock_rows,
        "feed_days_map": feed_days_map,
        "is_owner": is_owner(request.user),
        "chart_labels": chart_labels,
        "efficiency_actual": efficiency_actual,
        "efficiency_standard": efficiency_standard,
        "finance_profit": finance_profit,
        "sales_trend": sales_trend,
        "feed_days_labels": feed_days_labels,
        "feed_days_values": feed_days_values,
        "overall_eff_today": overall_eff_today,
        "overall_standard_today": overall_standard_today,
    }
    return render(request, "smartpoultry/dashboard.html", context)


@login_required
def egg_dashboard(request):
    if not request.user.has_perm("smartpoultry.view_dashboard") and not is_owner(request.user):
        return HttpResponseForbidden("Недостаточно прав для раздела яйценоскости.")

    target_date = _parse_date(request.GET.get("date")) or timezone.localdate()
    active_flocks = list(Flock.objects.filter(is_active=True).select_related("house").order_by("house__name", "name"))
    records_map = {
        record.flock_id: record
        for record in DailyProductionRecord.objects.filter(
            flock_id__in=[f.id for f in active_flocks],
            record_date=target_date,
        ).select_related("flock", "flock__house")
    }
    rows = []
    actual_values = []
    standard_values = []
    for flock in active_flocks:
        record = records_map.get(flock.id)
        expected = get_expected_efficiency_for_flock(flock, target_date)
        actual = record.efficiency_percent if record else None
        delta = (actual - expected) if actual is not None else None
        if actual is not None:
            actual_values.append(float(actual))
            standard_values.append(float(expected))
        rows.append(
            {
                "house": flock.house.name if flock.house else "Без корпуса",
                "flock": flock.name,
                "cross": flock.cross_name,
                "actual": round(float(actual), 2) if actual is not None else None,
                "expected": round(float(expected), 2),
                "delta": round(float(delta), 2) if delta is not None else None,
                "has_record": record is not None,
            }
        )

    overall_actual = round(sum(actual_values) / len(actual_values), 2) if actual_values else 0
    overall_expected = round(sum(standard_values) / len(standard_values), 2) if standard_values else 0

    standards = EggProductionStandard.objects.order_by("cross_name", "week_number")
    cross_filter = request.GET.get("cross", "").strip()
    if cross_filter:
        standards = standards.filter(cross_name__icontains=cross_filter)
    standards = list(standards[:500])
    standard_ranges = []
    prev = None
    for item in standards:
        if (
            prev
            and prev["cross_name"] == item.cross_name
            and prev["target_efficiency_percent"] == item.target_efficiency_percent
            and item.week_number == prev["end_week"] + 1
        ):
            prev["end_week"] = item.week_number
            continue
        prev = {
            "cross_name": item.cross_name,
            "start_week": item.week_number,
            "end_week": item.week_number,
            "target_efficiency_percent": item.target_efficiency_percent,
        }
        standard_ranges.append(prev)

    return render(
        request,
        "smartpoultry/egg_dashboard.html",
        {
            "target_date": target_date,
            "rows": rows,
            "overall_actual": overall_actual,
            "overall_expected": overall_expected,
            "cross_filter": cross_filter,
            "standard_ranges": standard_ranges,
        },
    )


@login_required
def egg_standard_create(request):
    if not request.user.has_perm("smartpoultry.add_eggproductionstandard"):
        return HttpResponseForbidden("Недостаточно прав для добавления эталона.")
    initial = {}
    for key in ("cross_name", "start_week", "end_week", "target_efficiency_percent"):
        value = request.GET.get(key)
        if value not in (None, ""):
            initial[key] = value
    if request.method == "POST":
        form = EggProductionStandardRangeForm(request.POST)
        if form.is_valid():
            cross = form.cleaned_data["cross_name"].strip()
            start_week = form.cleaned_data["start_week"]
            end_week = form.cleaned_data["end_week"]
            target = form.cleaned_data["target_efficiency_percent"]
            for week in range(start_week, end_week + 1):
                EggProductionStandard.objects.update_or_create(
                    cross_name=cross,
                    week_number=week,
                    defaults={"target_efficiency_percent": target},
                )
            messages.success(
                request,
                f"Эталон сохранен для кросса {cross}: недели {start_week}-{end_week}.",
            )
            return redirect("egg_dashboard")
    else:
        form = EggProductionStandardRangeForm(initial=initial)
    return render(request, "smartpoultry/egg_standard_form.html", {"form": form})


@login_required
def egg_standard_update(request, standard_id):
    if not request.user.has_perm("smartpoultry.change_eggproductionstandard"):
        return HttpResponseForbidden("Недостаточно прав для редактирования эталона.")
    standard = get_object_or_404(EggProductionStandard, id=standard_id)
    if request.method == "POST":
        form = EggProductionStandardForm(request.POST, instance=standard)
        if form.is_valid():
            form.save()
            messages.success(request, "Эталон яйценоскости обновлен.")
            return redirect("egg_dashboard")
    else:
        form = EggProductionStandardForm(instance=standard)
    return render(
        request,
        "smartpoultry/egg_standard_form.html",
        {"form": form, "standard": standard},
    )


@login_required
def daily_record_create(request):
    if not request.user.has_perm("smartpoultry.add_dailyproductionrecord"):
        messages.error(request, "Недостаточно прав для добавления дневной записи.")
        return redirect("dashboard")

    if request.method == "POST":
        form = DailyProductionRecordForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Дневная запись сохранена. Автопроверки и расчеты выполнены.")
            return redirect("dashboard")
    else:
        form = DailyProductionRecordForm(initial={"record_date": timezone.localdate()})
    return render(request, "smartpoultry/daily_record_form.html", {"form": form})


@user_passes_test(is_owner)
def manager_list(request):
    managers = User.objects.filter(groups__name="Manager").order_by("username").distinct()
    return render(request, "smartpoultry/manager_list.html", {"managers": managers})


@user_passes_test(is_owner)
def manager_create(request):
    if request.method == "POST":
        form = ManagerCreateForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Аккаунт менеджера создан.")
            return redirect("manager_list")
    else:
        form = ManagerCreateForm()
    return render(request, "smartpoultry/manager_form.html", {"form": form, "mode": "create"})


@user_passes_test(is_owner)
def manager_update(request, user_id):
    manager = get_object_or_404(User.objects.filter(groups__name="Manager"), id=user_id)
    if request.method == "POST":
        form = ManagerUpdateForm(request.POST, instance=manager)
        if form.is_valid():
            form.save()
            messages.success(request, "Аккаунт менеджера обновлен.")
            return redirect("manager_list")
    else:
        form = ManagerUpdateForm(instance=manager)
    return render(
        request,
        "smartpoultry/manager_form.html",
        {"form": form, "mode": "update", "manager": manager},
    )


@login_required
def poultry_house_list(request):
    if not request.user.has_perm("smartpoultry.view_poultryhouse"):
        return HttpResponseForbidden("Недостаточно прав для просмотра корпусов.")
    houses = PoultryHouse.objects.select_related("responsible_manager").order_by("name")
    return render(request, "smartpoultry/poultry_house_list.html", {"houses": houses})


@login_required
def poultry_house_create(request):
    if not request.user.has_perm("smartpoultry.add_poultryhouse"):
        return HttpResponseForbidden("Недостаточно прав для создания корпуса.")
    if request.method == "POST":
        form = PoultryHouseForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Корпус создан.")
            return redirect("poultry_house_list")
    else:
        form = PoultryHouseForm()
    return render(request, "smartpoultry/poultry_house_form.html", {"form": form})


@login_required
def poultry_house_update(request, house_id):
    if not request.user.has_perm("smartpoultry.change_poultryhouse"):
        return HttpResponseForbidden("Недостаточно прав для редактирования корпуса.")
    house = get_object_or_404(PoultryHouse, id=house_id)
    if request.method == "POST":
        form = PoultryHouseForm(request.POST, instance=house)
        if form.is_valid():
            form.save()
            messages.success(request, "Корпус обновлен.")
            return redirect("poultry_house_list")
    else:
        form = PoultryHouseForm(instance=house)
    return render(request, "smartpoultry/poultry_house_form.html", {"form": form, "house": house})


@login_required
def incident_cause_list(request):
    if not request.user.has_perm("smartpoultry.view_incidentcause"):
        return HttpResponseForbidden("Недостаточно прав для просмотра причин.")
    causes = IncidentCause.objects.order_by("name")
    return render(request, "smartpoultry/incident_cause_list.html", {"causes": causes})


@login_required
def incident_cause_create(request):
    if not request.user.has_perm("smartpoultry.add_incidentcause"):
        return HttpResponseForbidden("Недостаточно прав для создания причин.")
    if request.method == "POST":
        form = IncidentCauseForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Причина инцидента добавлена.")
            return redirect("incident_cause_list")
    else:
        form = IncidentCauseForm()
    return render(request, "smartpoultry/incident_cause_form.html", {"form": form})


@login_required
def feed_type_list(request):
    if not request.user.has_perm("smartpoultry.view_feedtype"):
        return HttpResponseForbidden("Недостаточно прав для просмотра типов корма.")
    feed_types = FeedType.objects.order_by("name")
    return render(request, "smartpoultry/feed_type_list.html", {"feed_types": feed_types})


@login_required
def feed_type_create(request):
    if not request.user.has_perm("smartpoultry.add_feedtype"):
        return HttpResponseForbidden("Недостаточно прав для добавления типа корма.")
    if request.method == "POST":
        form = FeedTypeForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Тип корма добавлен.")
            return redirect("feed_type_list")
    else:
        form = FeedTypeForm()
    return render(request, "smartpoultry/feed_type_form.html", {"form": form})


@login_required
def feed_type_update(request, feed_type_id):
    if not request.user.has_perm("smartpoultry.change_feedtype"):
        return HttpResponseForbidden("Недостаточно прав для редактирования типа корма.")
    feed_type = get_object_or_404(FeedType, id=feed_type_id)
    if request.method == "POST":
        form = FeedTypeForm(request.POST, instance=feed_type)
        if form.is_valid():
            form.save()
            messages.success(request, "Тип корма обновлен.")
            return redirect("feed_type_list")
    else:
        form = FeedTypeForm(instance=feed_type)
    return render(
        request,
        "smartpoultry/feed_type_form.html",
        {"form": form, "feed_type_obj": feed_type},
    )


@login_required
def feed_expense_list(request):
    if not request.user.has_perm("smartpoultry.view_feedexpense"):
        return HttpResponseForbidden("Недостаточно прав для просмотра расходов на корм.")

    items = FeedExpense.objects.select_related("house", "flock", "feed_type").order_by(
        "-expense_date", "-created_at"
    )
    date_from = _parse_date(request.GET.get("date_from"))
    date_to = _parse_date(request.GET.get("date_to"))
    house_id = request.GET.get("house_id", "").strip()
    feed_type_id = request.GET.get("feed_type_id", "").strip()
    expense_type = request.GET.get("expense_type", "").strip()

    if date_from:
        items = items.filter(expense_date__gte=date_from)
    if date_to:
        items = items.filter(expense_date__lte=date_to)
    if house_id:
        items = items.filter(house_id=house_id)
    if feed_type_id:
        items = items.filter(feed_type_id=feed_type_id)
    if expense_type:
        items = items.filter(expense_type=expense_type)

    total_amount = items.aggregate(v=Sum("amount")).get("v") or Decimal("0.00")
    total_kg = items.aggregate(v=Sum("quantity_kg")).get("v") or Decimal("0.000")

    auto_out = FeedStockMovement.objects.select_related("feed_type", "flock", "flock__house").filter(
        movement_type=FeedStockMovement.MovementType.OUT
    )
    if date_from:
        auto_out = auto_out.filter(movement_date__gte=date_from)
    if date_to:
        auto_out = auto_out.filter(movement_date__lte=date_to)
    if house_id:
        auto_out = auto_out.filter(flock__house_id=house_id)
    if feed_type_id:
        auto_out = auto_out.filter(feed_type_id=feed_type_id)

    auto_consumption_cost = Decimal("0.00")
    auto_consumption_kg = Decimal("0.000")
    for movement in auto_out:
        auto_consumption_kg += Decimal(movement.quantity_kg)
        auto_consumption_cost += Decimal(movement.quantity_kg) * Decimal(
            movement.feed_type.cost_per_kg
        )

    return render(
        request,
        "smartpoultry/feed_expense_list.html",
        {
            "items": items,
            "total_amount": total_amount,
            "total_kg": total_kg,
            "auto_consumption_cost": auto_consumption_cost.quantize(Decimal("0.01")),
            "auto_consumption_kg": auto_consumption_kg.quantize(Decimal("0.001")),
            "houses": PoultryHouse.objects.order_by("name"),
            "feed_types": FeedType.objects.order_by("name"),
            "expense_types": FeedExpense.ExpenseType.choices,
            "filters": {
                "date_from": request.GET.get("date_from", ""),
                "date_to": request.GET.get("date_to", ""),
                "house_id": house_id,
                "feed_type_id": feed_type_id,
                "expense_type": expense_type,
            },
        },
    )


@login_required
def feed_expense_create(request):
    if not request.user.has_perm("smartpoultry.add_feedexpense"):
        return HttpResponseForbidden("Недостаточно прав для добавления расходов на корм.")
    if request.method == "POST":
        form = FeedExpenseForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Расход на корм сохранен.")
            return redirect("feed_expense_list")
    else:
        form = FeedExpenseForm(initial={"expense_date": timezone.localdate()})
    return render(request, "smartpoultry/feed_expense_form.html", {"form": form})


@login_required
def feed_expense_update(request, expense_id):
    if not request.user.has_perm("smartpoultry.change_feedexpense"):
        return HttpResponseForbidden("Недостаточно прав для редактирования расходов.")
    expense = get_object_or_404(FeedExpense, id=expense_id)
    if request.method == "POST":
        form = FeedExpenseForm(request.POST, instance=expense)
        if form.is_valid():
            form.save()
            messages.success(request, "Расход на корм обновлен.")
            return redirect("feed_expense_list")
    else:
        form = FeedExpenseForm(instance=expense)
    return render(
        request,
        "smartpoultry/feed_expense_form.html",
        {"form": form, "expense": expense},
    )


@login_required
def feed_expense_delete(request, expense_id):
    if request.method != "POST":
        return HttpResponseForbidden("Метод не поддерживается.")
    if not request.user.has_perm("smartpoultry.delete_feedexpense"):
        return HttpResponseForbidden("Недостаточно прав для удаления расходов.")
    expense = get_object_or_404(FeedExpense, id=expense_id)
    expense.delete()
    messages.success(request, "Расход на корм удален.")
    return redirect("feed_expense_list")


@login_required
def feed_expenses_export_pdf(request):
    if not request.user.has_perm("smartpoultry.view_feedexpense"):
        return HttpResponseForbidden("Недостаточно прав для экспорта расходов на корм.")
    items = FeedExpense.objects.select_related("house", "flock", "feed_type").order_by("-expense_date")[:400]
    rows = [
        [
            item.expense_date.strftime("%d.%m.%Y"),
            item.house.name if item.house else "-",
            item.flock.name if item.flock else "-",
            item.feed_type.name if item.feed_type else "-",
            item.get_expense_type_display(),
            item.quantity_kg,
            item.amount,
            item.note or "-",
        ]
        for item in items
    ] or [["-", "-", "-", "-", "-", "-", "-", "Нет данных"]]
    return _build_pdf_table_response(
        title="Расходы на корм SmartPoultry",
        filename=f"smartpoultry_feed_expenses_{timezone.localdate()}.pdf",
        headers=[
            "Дата",
            "Корпус",
            "Стадо",
            "Корм",
            "Статья",
            "Количество, кг",
            "Сумма, руб.",
            "Комментарий",
        ],
        rows=rows,
    )


def _build_xlsx_or_csv_response(filename_base, headers, rows, sheet_name):
    try:
        from openpyxl import Workbook
    except Exception:
        response = HttpResponse(
            content_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.csv"'},
        )
        writer = csv.writer(response, delimiter=";")
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return response

    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31] or "Sheet1"
    ws.append(headers)
    for row in rows:
        ws.append(list(row))
    for column_cells in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in column_cells)
        ws.column_dimensions[column_cells[0].column_letter].width = min(max(12, max_length + 2), 45)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return HttpResponse(
        buffer.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename_base}.xlsx"'},
    )


@login_required
def feed_expenses_export_excel(request):
    if not request.user.has_perm("smartpoultry.view_feedexpense"):
        return HttpResponseForbidden("Недостаточно прав для экспорта расходов на корм.")
    items = FeedExpense.objects.select_related("house", "flock", "feed_type").order_by("-expense_date")[:1000]
    rows = [
        [
            item.expense_date.strftime("%d.%m.%Y"),
            item.house.name if item.house else "-",
            item.flock.name if item.flock else "-",
            item.feed_type.name if item.feed_type else "-",
            item.get_expense_type_display(),
            float(item.quantity_kg),
            float(item.amount),
            item.note or "-",
        ]
        for item in items
    ]
    return _build_xlsx_or_csv_response(
        filename_base=f"smartpoultry_feed_expenses_{timezone.localdate()}",
        headers=[
            "Дата",
            "Корпус",
            "Стадо",
            "Тип корма",
            "Статья",
            "Количество, кг",
            "Сумма, ₽",
            "Комментарий",
        ],
        rows=rows,
        sheet_name="Расходы на корм",
    )


@login_required
def warehouse_export_excel(request):
    if not request.user.has_perm("smartpoultry.view_feedstock"):
        return HttpResponseForbidden("Недостаточно прав для экспорта склада.")

    stocks = FeedStock.objects.select_related("feed_type").order_by("feed_type__name")
    rows = [
        [
            "Остаток",
            stock.feed_type.name,
            "",
            "",
            float(stock.quantity_kg),
            "",
            "",
            stock.updated_at.strftime("%d.%m.%Y %H:%M"),
        ]
        for stock in stocks
    ]
    recent = FeedStockMovement.objects.select_related("feed_type", "flock").order_by("-movement_date", "-created_at")[:300]
    for item in recent:
        rows.append(
            [
                "Движение",
                item.feed_type.name,
                item.get_movement_type_display(),
                item.flock.name if item.flock else "-",
                float(item.quantity_kg),
                item.movement_date.strftime("%d.%m.%Y"),
                item.note or "-",
                "",
            ]
        )
    return _build_xlsx_or_csv_response(
        filename_base=f"smartpoultry_warehouse_{timezone.localdate()}",
        headers=[
            "Раздел",
            "Корм",
            "Тип/Операция",
            "Стадо",
            "Количество, кг",
            "Дата",
            "Комментарий",
            "Обновлено",
        ],
        rows=rows,
        sheet_name="Склад",
    )


@login_required
def sales_list(request):
    if not request.user.has_perm("smartpoultry.view_sale"):
        return HttpResponseForbidden("Недостаточно прав для просмотра продаж.")

    sales = Sale.objects.select_related("customer", "flock", "flock__house")
    date_from = _parse_date(request.GET.get("date_from"))
    date_to = _parse_date(request.GET.get("date_to"))
    status_filter = request.GET.get("status", "").strip()
    if date_from:
        sales = sales.filter(sale_date__gte=date_from)
    if date_to:
        sales = sales.filter(sale_date__lte=date_to)
    if status_filter:
        sales = sales.filter(status=status_filter)

    sales = sales.annotate(
        is_closed=Case(
            When(
                status__in=[Sale.Status.COMPLETED, Sale.Status.CANCELED],
                then=Value(1),
            ),
            default=Value(0),
            output_field=IntegerField(),
        )
    ).order_by("is_closed", "-sale_date", "-created_at")

    total_sales = sales.aggregate(total=Sum("total_amount")).get("total") or 0
    total_paid = sales.aggregate(total=Sum("paid_amount")).get("total") or 0
    receivable = total_sales - total_paid
    active_sales = sales.exclude(status__in=[Sale.Status.COMPLETED, Sale.Status.CANCELED])[:8]
    return render(
        request,
        "smartpoultry/sales_list.html",
        {
            "sales": sales,
            "active_sales": active_sales,
            "total_sales": total_sales,
            "total_paid": total_paid,
            "receivable": receivable,
            "status_choices": Sale.Status.choices,
            "filters": {
                "date_from": request.GET.get("date_from", ""),
                "date_to": request.GET.get("date_to", ""),
                "status": status_filter,
            },
        },
    )


@login_required
def sale_create(request):
    if not request.user.has_perm("smartpoultry.add_sale"):
        return HttpResponseForbidden("Недостаточно прав для создания продажи.")
    if request.method == "POST":
        form = SaleForm(request.POST)
        if form.is_valid():
            sale = form.save()
            messages.success(
                request,
                f"Продажа сохранена. Сумма: {sale.total_amount} ₽.",
            )
            return redirect("sales_list")
    else:
        form = SaleForm(initial={"sale_date": timezone.localdate()})
    return render(request, "smartpoultry/sale_form.html", {"form": form})


@login_required
def sale_status_update(request, sale_id):
    if request.method != "POST":
        return HttpResponseForbidden("Метод не поддерживается.")
    if not request.user.has_perm("smartpoultry.change_sale"):
        return HttpResponseForbidden("Недостаточно прав для изменения статуса продажи.")

    sale = get_object_or_404(Sale, id=sale_id)
    form = SaleStatusUpdateForm(request.POST, instance=sale)
    if form.is_valid():
        form.save()
        messages.success(request, "Статус продажи обновлен.")
    else:
        messages.error(request, "Не удалось обновить статус продажи.")
    return redirect("sales_list")


@login_required
def customer_create(request):
    if not request.user.has_perm("smartpoultry.add_customer"):
        return HttpResponseForbidden("Недостаточно прав для добавления клиента.")
    if request.method == "POST":
        form = CustomerForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Клиент добавлен.")
            return redirect("customer_list")
    else:
        form = CustomerForm()
    return render(request, "smartpoultry/customer_form.html", {"form": form})


@login_required
def customer_list(request):
    if not request.user.has_perm("smartpoultry.view_customer"):
        return HttpResponseForbidden("Недостаточно прав для просмотра клиентов.")
    items = Customer.objects.order_by("name")
    return render(request, "smartpoultry/customer_list.html", {"customers": items})


@login_required
def customer_update(request, customer_id):
    if not request.user.has_perm("smartpoultry.change_customer"):
        return HttpResponseForbidden("Недостаточно прав для редактирования клиентов.")
    customer = get_object_or_404(Customer, id=customer_id)
    if request.method == "POST":
        form = CustomerForm(request.POST, instance=customer)
        if form.is_valid():
            form.save()
            messages.success(request, "Данные клиента обновлены.")
            return redirect("customer_list")
    else:
        form = CustomerForm(instance=customer)
    return render(
        request,
        "smartpoultry/customer_form.html",
        {"form": form, "customer": customer},
    )


@user_passes_test(is_owner)
def seed_reference_data_view(request):
    if request.method != "POST":
        return HttpResponseForbidden("Метод не поддерживается.")

    seed_reference_data()
    messages.success(request, "Справочники и эталоны обновлены.")
    return redirect("dashboard")


@user_passes_test(is_owner)
def setup_wizard(request, step=1):
    step = int(step or 1)
    if step not in (1, 2, 3):
        return redirect("setup_wizard", step=1)

    context = {"step": step}

    if step == 1:
        if request.method == "POST":
            form = SetupFlockForm(request.POST)
            if form.is_valid():
                form.save()
                messages.success(request, "Шаг 1 завершен: стадо создано.")
                return redirect("setup_wizard", step=2)
        else:
            form = SetupFlockForm()
        context["form"] = form
        context["title"] = "Шаг 1. Создание стада"
        return render(request, "smartpoultry/setup_wizard.html", context)

    if step == 2:
        seed_reference_data()
        if request.method == "POST":
            form = SetupFeedStockForm(request.POST)
            if form.is_valid():
                form.save()
                messages.success(request, "Шаг 2 завершен: стартовый остаток корма сохранен.")
                return redirect("setup_wizard", step=3)
        else:
            form = SetupFeedStockForm()
        context["form"] = form
        context["title"] = "Шаг 2. Стартовый остаток корма"
        return render(request, "smartpoultry/setup_wizard.html", context)

    managers = User.objects.filter(groups__name="Manager").order_by("username").distinct()
    context["title"] = "Шаг 3. Проверка прав менеджеров"
    context["managers"] = managers
    return render(request, "smartpoultry/setup_wizard.html", context)


@login_required
def purchase_request_list(request):
    if not request.user.has_perm("smartpoultry.view_purchaserequest") and not can_approve_purchase_requests(request.user):
        return HttpResponseForbidden("Недостаточно прав для просмотра заявок.")

    requests_qs = PurchaseRequest.objects.select_related("feed_type", "flock")
    status_filter = request.GET.get("status", "").strip()
    flock_id = request.GET.get("flock_id", "").strip()
    date_from = _parse_date(request.GET.get("date_from"))
    date_to = _parse_date(request.GET.get("date_to"))

    if status_filter:
        requests_qs = requests_qs.filter(status=status_filter)
    if flock_id:
        requests_qs = requests_qs.filter(flock_id=flock_id)
    if date_from:
        requests_qs = requests_qs.filter(created_at__date__gte=date_from)
    if date_to:
        requests_qs = requests_qs.filter(created_at__date__lte=date_to)

    requests_qs = requests_qs.order_by("status", "-created_at")
    flocks = Flock.objects.order_by("name")
    return render(
        request,
        "smartpoultry/purchase_request_list.html",
        {
            "purchase_requests": requests_qs,
            "can_approve": can_approve_purchase_requests(request.user),
            "can_receive": request.user.has_perm("smartpoultry.add_feedstockmovement"),
            "status_choices": PurchaseRequest.Status.choices,
            "flocks": flocks,
            "filters": {
                "status": status_filter,
                "flock_id": flock_id,
                "date_from": request.GET.get("date_from", ""),
                "date_to": request.GET.get("date_to", ""),
            },
        },
    )


@login_required
def purchase_request_create(request):
    if not request.user.has_perm("smartpoultry.add_purchaserequest"):
        return HttpResponseForbidden("Недостаточно прав для создания заявки.")
    if request.method == "POST":
        form = PurchaseRequestManualForm(request.POST)
        if form.is_valid():
            item = form.save(commit=False)
            item.status = PurchaseRequest.Status.PENDING
            item.days_to_zero = get_feed_days_to_zero(item.feed_type, timezone.localdate())
            item.save()
            messages.success(request, "Ручная заявка на закупку создана.")
            return redirect("purchase_request_list")
    else:
        form = PurchaseRequestManualForm()
    return render(request, "smartpoultry/purchase_request_form.html", {"form": form})


@login_required
def purchase_request_decision(request, request_id, decision):
    if request.method != "POST":
        return HttpResponseForbidden("Метод не поддерживается.")
    if not can_approve_purchase_requests(request.user):
        return HttpResponseForbidden("Недостаточно прав для подтверждения заявки.")

    purchase_request = get_object_or_404(PurchaseRequest, id=request_id)
    if purchase_request.status != PurchaseRequest.Status.PENDING:
        messages.warning(request, "Заявка уже обработана.")
        return redirect("purchase_request_list")

    if decision == "approve":
        purchase_request.status = PurchaseRequest.Status.APPROVED
        messages.success(request, "Заявка утверждена.")
    elif decision == "reject":
        purchase_request.status = PurchaseRequest.Status.REJECTED
        messages.success(request, "Заявка отклонена.")
    else:
        return HttpResponseForbidden("Некорректное действие.")

    purchase_request.save(update_fields=["status", "updated_at"])
    return redirect("purchase_request_list")


@login_required
def purchase_receipt(request):
    can_receive = request.user.has_perm("smartpoultry.add_feedstockmovement")
    can_view = request.user.has_perm("smartpoultry.view_purchaserequest")
    if not can_receive or not can_view:
        return HttpResponseForbidden("Недостаточно прав для приемки поставки.")

    form = PurchaseReceiptForm()
    if request.method == "POST":
        form = PurchaseReceiptForm(request.POST)
        if form.is_valid():
            purchase_request = form.cleaned_data["purchase_request"]
            received_kg = Decimal(form.cleaned_data["received_kg"])
            note = form.cleaned_data["note"] or "Приход по утвержденной заявке"

            stock, _ = FeedStock.objects.get_or_create(feed_type=purchase_request.feed_type)
            stock.quantity_kg = Decimal(stock.quantity_kg) + received_kg
            stock.save(update_fields=["quantity_kg", "updated_at"])

            FeedStockMovement.objects.create(
                feed_type=purchase_request.feed_type,
                flock=purchase_request.flock,
                movement_type=FeedStockMovement.MovementType.IN,
                quantity_kg=received_kg,
                note=f"{note}. Заявка #{purchase_request.id}",
            )

            purchase_request.received_kg = Decimal(purchase_request.received_kg) + received_kg
            if purchase_request.remaining_kg <= 0:
                purchase_request.status = PurchaseRequest.Status.FULFILLED
                messages.success(request, "Поставка принята. Заявка полностью исполнена.")
            else:
                messages.success(
                    request,
                    f"Поставка принята. По заявке осталось: {purchase_request.remaining_kg} кг.",
                )
            purchase_request.save(update_fields=["received_kg", "status", "updated_at"])
            return redirect("purchase_receipt")

    approved_requests = (
        PurchaseRequest.objects.filter(status=PurchaseRequest.Status.APPROVED)
        .select_related("feed_type", "flock")
        .order_by("-created_at")
    )
    pending_requests = (
        PurchaseRequest.objects.filter(status=PurchaseRequest.Status.PENDING)
        .select_related("feed_type", "flock")
        .order_by("-created_at")[:15]
    )
    return render(
        request,
        "smartpoultry/purchase_receipt.html",
        {
            "form": form,
            "approved_requests": approved_requests,
            "pending_requests": pending_requests,
        },
    )


@login_required
def incidents_list(request):
    if not request.user.has_perm("smartpoultry.view_alert"):
        return HttpResponseForbidden("Недостаточно прав для просмотра инцидентов.")

    incidents = Alert.objects.select_related("flock", "related_sale")
    status_filter = request.GET.get("status", "").strip()
    flock_id = request.GET.get("flock_id", "").strip()
    date_from = _parse_date(request.GET.get("date_from"))
    date_to = _parse_date(request.GET.get("date_to"))

    if status_filter:
        incidents = incidents.filter(status=status_filter)
    if flock_id:
        incidents = incidents.filter(flock_id=flock_id)
    if date_from:
        incidents = incidents.filter(created_at__date__gte=date_from)
    if date_to:
        incidents = incidents.filter(created_at__date__lte=date_to)
    incidents = incidents.order_by("-created_at")

    return render(
        request,
        "smartpoultry/incidents_list.html",
        {
            "incidents": incidents,
            "status_choices": Alert.Status.choices,
            "flocks": Flock.objects.order_by("name"),
            "can_change_alert": request.user.has_perm("smartpoultry.change_alert") or is_owner(request.user),
            "filters": {
                "status": status_filter,
                "flock_id": flock_id,
                "date_from": request.GET.get("date_from", ""),
                "date_to": request.GET.get("date_to", ""),
            },
        },
    )


@login_required
def incident_status_update(request, incident_id):
    if request.method != "POST":
        return HttpResponseForbidden("Метод не поддерживается.")
    if not (request.user.has_perm("smartpoultry.change_alert") or is_owner(request.user)):
        return HttpResponseForbidden("Недостаточно прав для изменения статуса инцидента.")

    incident = get_object_or_404(Alert, id=incident_id)
    new_status = request.POST.get("status", "").strip()
    valid_statuses = {choice[0] for choice in Alert.Status.choices}
    if new_status not in valid_statuses:
        messages.error(request, "Некорректный статус инцидента.")
        return redirect("incidents_list")

    incident.status = new_status
    if new_status == Alert.Status.RESOLVED and not incident.capa_closed_at:
        incident.capa_closed_at = timezone.now()
        incident.save(update_fields=["status", "capa_closed_at", "updated_at"])
    else:
        incident.save(update_fields=["status", "updated_at"])
    messages.success(request, "Статус инцидента обновлен.")
    return redirect("incidents_list")


@login_required
def incident_capa_update(request, incident_id):
    if not can_manage_alerts(request.user):
        return HttpResponseForbidden("Недостаточно прав для CAPA.")
    incident = get_object_or_404(Alert, id=incident_id)
    if request.method == "POST":
        form = IncidentCapaForm(request.POST, instance=incident)
        if form.is_valid():
            updated = form.save(commit=False)
            if updated.status == Alert.Status.RESOLVED and not updated.capa_closed_at:
                updated.capa_closed_at = timezone.now()
            updated.save()
            messages.success(request, "CAPA карточка обновлена.")
            return redirect("incidents_list")
    else:
        form = IncidentCapaForm(instance=incident)
    return render(
        request,
        "smartpoultry/incident_capa_form.html",
        {"form": form, "incident": incident},
    )


@login_required
def incident_export_pdf(request, incident_id):
    if not request.user.has_perm("smartpoultry.view_alert"):
        return HttpResponseForbidden("Недостаточно прав для экспорта инцидента.")
    incident = get_object_or_404(Alert.objects.select_related("flock", "related_record"), id=incident_id)
    rows = [
        ["Дата", incident.created_at.strftime("%d.%m.%Y %H:%M")],
        ["Статус", incident.get_status_display()],
        ["Серьезность", incident.get_severity_display()],
        ["Тип", incident.get_alert_type_display()],
        ["Стадо", incident.flock.name if incident.flock else "-"],
        ["Заголовок", incident.title],
        ["Описание", incident.message],
    ]
    return _build_pdf_table_response(
        title=f"Инцидент #{incident.id}",
        filename=f"incident_{incident.id}_{timezone.localdate()}.pdf",
        headers=["Поле", "Значение"],
        rows=rows,
        subtitle="Карточка инцидента SmartPoultry",
    )


@login_required
def incident_overdue_notice_pdf(request, incident_id):
    if not request.user.has_perm("smartpoultry.view_alert"):
        return HttpResponseForbidden("Недостаточно прав для экспорта уведомления.")
    incident = get_object_or_404(
        Alert.objects.select_related("related_sale", "related_sale__customer"),
        id=incident_id,
    )
    sale = _get_sale_for_overdue_incident(incident)
    if not sale:
        messages.error(
            request,
            "Для этого инцидента не удалось определить продажу для формирования уведомления.",
        )
        return redirect("incidents_list")
    return _build_overdue_notice_pdf_response(sale)


@login_required
def incidents_export_pdf(request):
    if not request.user.has_perm("smartpoultry.view_alert"):
        return HttpResponseForbidden("Недостаточно прав для экспорта инцидентов.")
    incidents = Alert.objects.select_related("flock").order_by("-created_at")[:300]
    rows = [
        [
            i.created_at.strftime("%d.%m.%Y %H:%M"),
            i.get_status_display(),
            i.get_severity_display(),
            i.get_alert_type_display(),
            i.flock.name if i.flock else "-",
            i.title,
        ]
        for i in incidents
    ] or [["-", "-", "-", "-", "-", "Инцидентов нет"]]
    return _build_pdf_table_response(
        title="SmartPoultry - Инциденты",
        filename=f"smartpoultry_incidents_{timezone.localdate()}.pdf",
        headers=["Дата", "Статус", "Серьезность", "Тип", "Стадо", "Заголовок"],
        rows=rows,
        subtitle=f"Сформировано: {timezone.localtime().strftime('%d.%m.%Y %H:%M')}",
    )


@login_required
def incidents_print(request):
    if not request.user.has_perm("smartpoultry.view_alert"):
        return HttpResponseForbidden("Недостаточно прав для печати инцидентов.")
    incidents = Alert.objects.select_related("flock").order_by("-created_at")
    return render(request, "smartpoultry/incidents_print.html", {"incidents": incidents})


@login_required
def purchase_requests_export_pdf(request):
    if not request.user.has_perm("smartpoultry.view_purchaserequest"):
        return HttpResponseForbidden("Недостаточно прав для экспорта заявок.")
    items = PurchaseRequest.objects.select_related("feed_type", "flock").order_by("-created_at")[:300]
    rows = [
        [
            i.created_at.strftime("%d.%m.%Y %H:%M"),
            i.get_status_display(),
            i.feed_type.name,
            i.flock.name if i.flock else "-",
            i.requested_kg,
            i.received_kg,
            i.remaining_kg,
        ]
        for i in items
    ] or [["-", "-", "-", "-", "-", "-", "Заявок нет"]]
    return _build_pdf_table_response(
        title="SmartPoultry - Заявки на закупку",
        filename=f"smartpoultry_purchase_requests_{timezone.localdate()}.pdf",
        headers=[
            "Дата",
            "Статус",
            "Корм",
            "Стадо",
            "Запрошено, кг",
            "Принято, кг",
            "Осталось, кг",
        ],
        rows=rows,
        subtitle=f"Сформировано: {timezone.localtime().strftime('%d.%m.%Y %H:%M')}",
    )


@login_required
def purchase_requests_print(request):
    if not request.user.has_perm("smartpoultry.view_purchaserequest"):
        return HttpResponseForbidden("Недостаточно прав для печати заявок.")
    items = PurchaseRequest.objects.select_related("feed_type", "flock").order_by("-created_at")
    return render(request, "smartpoultry/purchase_requests_print.html", {"purchase_requests": items})


@login_required
def kpi_dashboard(request):
    if not request.user.has_perm("smartpoultry.view_dashboard") and not is_owner(request.user):
        return HttpResponseForbidden("Недостаточно прав для KPI.")

    context = _build_kpi_context()
    return render(request, "smartpoultry/kpi_dashboard.html", context)


def _build_kpi_context():
    today = timezone.localdate()
    period_start = today - timedelta(days=13)
    houses = PoultryHouse.objects.prefetch_related("flocks").order_by("name")
    kpi_rows = []
    for house in houses:
        house_flocks = list(house.flocks.all())
        if not house_flocks:
            continue
        flock_ids = [f.id for f in house_flocks]
        records = DailyProductionRecord.objects.filter(
            flock_id__in=flock_ids, record_date__range=[period_start, today]
        )
        avg_eff = records.aggregate(v=Avg("efficiency_percent")).get("v") or 0
        # Breakage percent is easier to compute in python for sqlite compatibility.
        break_values = [float(r.breakage_percent) for r in records]
        avg_break = round(sum(break_values) / len(break_values), 2) if break_values else 0

        total_live = sum(f.live_population(today) for f in house_flocks)
        house_movements = FeedStockMovement.objects.filter(
            flock_id__in=flock_ids,
            movement_type=FeedStockMovement.MovementType.OUT,
            movement_date__range=[period_start, today],
        )
        total_feed_out = house_movements.aggregate(v=Sum("quantity_kg")).get("v") or 0
        feed_per_head_g = (
            round((float(total_feed_out) * 1000) / max(total_live, 1) / 14, 2) if total_live else 0
        )

        finance = DailyFinanceSnapshot.objects.filter(
            flock_id__in=flock_ids, snapshot_date__range=[period_start, today]
        )
        revenue_total = finance.aggregate(v=Sum("revenue")).get("v") or Decimal("0.00")
        feed_cost_snapshot = finance.aggregate(v=Sum("feed_cost")).get("v") or Decimal("0.00")
        extra_feed_expense = (
            FeedExpense.objects.filter(
                house=house, expense_date__range=[period_start, today]
            ).aggregate(v=Sum("amount")).get("v")
            or Decimal("0.00")
        )
        total_feed_cost = Decimal(feed_cost_snapshot) + Decimal(extra_feed_expense)
        margin = Decimal(revenue_total) - total_feed_cost

        kpi_rows.append(
            {
                "house_name": house.name,
                "avg_eff": round(float(avg_eff), 2),
                "avg_break": avg_break,
                "feed_per_head_g": feed_per_head_g,
                "revenue_total": round(float(revenue_total), 2),
                "feed_cost_total": round(float(total_feed_cost), 2),
                "margin": round(float(margin), 2),
                "record_count": records.count(),
            }
        )

    flocks_without_house = list(Flock.objects.filter(is_active=True, house__isnull=True))
    if flocks_without_house:
        flock_ids = [f.id for f in flocks_without_house]
        records = DailyProductionRecord.objects.filter(
            flock_id__in=flock_ids, record_date__range=[period_start, today]
        )
        avg_eff = records.aggregate(v=Avg("efficiency_percent")).get("v") or 0
        break_values = [float(r.breakage_percent) for r in records]
        avg_break = round(sum(break_values) / len(break_values), 2) if break_values else 0
        total_live = sum(f.live_population(today) for f in flocks_without_house)
        house_movements = FeedStockMovement.objects.filter(
            flock_id__in=flock_ids,
            movement_type=FeedStockMovement.MovementType.OUT,
            movement_date__range=[period_start, today],
        )
        total_feed_out = house_movements.aggregate(v=Sum("quantity_kg")).get("v") or 0
        feed_per_head_g = (
            round((float(total_feed_out) * 1000) / max(total_live, 1) / 14, 2) if total_live else 0
        )
        finance = DailyFinanceSnapshot.objects.filter(
            flock_id__in=flock_ids, snapshot_date__range=[period_start, today]
        )
        revenue_total = finance.aggregate(v=Sum("revenue")).get("v") or Decimal("0.00")
        feed_cost_snapshot = finance.aggregate(v=Sum("feed_cost")).get("v") or Decimal("0.00")
        extra_feed_expense = (
            FeedExpense.objects.filter(
                flock_id__in=flock_ids, expense_date__range=[period_start, today], house__isnull=True
            ).aggregate(v=Sum("amount")).get("v")
            or Decimal("0.00")
        )
        total_feed_cost = Decimal(feed_cost_snapshot) + Decimal(extra_feed_expense)
        margin = Decimal(revenue_total) - total_feed_cost
        kpi_rows.append(
            {
                "house_name": "Без корпуса",
                "avg_eff": round(float(avg_eff), 2),
                "avg_break": avg_break,
                "feed_per_head_g": feed_per_head_g,
                "revenue_total": round(float(revenue_total), 2),
                "feed_cost_total": round(float(total_feed_cost), 2),
                "margin": round(float(margin), 2),
                "record_count": records.count(),
            }
        )

    trend_dates = [period_start + timedelta(days=i) for i in range(14)]
    labels = [d.strftime("%d.%m") for d in trend_dates]
    revenue_trend = []
    margin_trend = []
    for d in trend_dates:
        day_finance = DailyFinanceSnapshot.objects.filter(snapshot_date=d).aggregate(
            revenue=Sum("revenue"),
            profit=Sum("gross_profit"),
        )
        revenue_trend.append(round(float(day_finance.get("revenue") or 0), 2))
        margin_trend.append(round(float(day_finance.get("profit") or 0), 2))

    return {
        "kpi_rows": kpi_rows,
        "labels": labels,
        "revenue_trend": revenue_trend,
        "margin_trend": margin_trend,
        "period_start": period_start,
        "today": today,
    }


@login_required
def kpi_export_pdf(request):
    if not request.user.has_perm("smartpoultry.view_dashboard") and not is_owner(request.user):
        return HttpResponseForbidden("Недостаточно прав для экспорта KPI.")
    context = _build_kpi_context()
    rows = [
        [
            item["house_name"],
            item["avg_eff"],
            item["avg_break"],
            item["feed_per_head_g"],
            item["revenue_total"],
            item["feed_cost_total"],
            item["margin"],
        ]
        for item in context["kpi_rows"]
    ] or [["-", "-", "-", "-", "-", "-", "-"]]
    return _build_pdf_table_response(
        title="KPI руководителя SmartPoultry",
        filename=f"smartpoultry_kpi_{timezone.localdate()}.pdf",
        headers=[
            "Корпус",
            "Эффективность, %",
            "Бой, %",
            "Корм/гол/день, г",
            "Выручка по яйцу, руб.",
            "Расход на корм, руб.",
            "Маржа, руб.",
        ],
        rows=rows,
        subtitle=f"Период: {context['period_start']} - {context['today']}",
    )


@login_required
def sales_export_pdf(request):
    if not request.user.has_perm("smartpoultry.view_sale"):
        return HttpResponseForbidden("Недостаточно прав для экспорта продаж.")
    items = Sale.objects.select_related("customer", "flock", "flock__house").order_by("-sale_date")[:400]
    rows = [
        [
            s.sale_date.strftime("%d.%m.%Y"),
            s.customer.name if s.customer else "-",
            s.total_amount,
            s.paid_amount,
            s.get_status_display(),
        ]
        for s in items
    ] or [["-", "-", "-", "-", "-", "Нет данных"]]
    return _build_pdf_table_response(
        title="Продажи и дебиторка SmartPoultry",
        filename=f"smartpoultry_sales_{timezone.localdate()}.pdf",
        headers=[
            "Дата",
            "Клиент",
            "Сумма, руб.",
            "Оплачено, руб.",
            "Статус",
        ],
        rows=rows,
    )


@login_required
def capa_export_pdf(request):
    if not request.user.has_perm("smartpoultry.view_alert"):
        return HttpResponseForbidden("Недостаточно прав для экспорта CAPA.")
    alerts = Alert.objects.select_related("cause", "capa_responsible", "flock").order_by("-created_at")[:400]
    rows = [
        [
            a.created_at.strftime("%d.%m.%Y"),
            a.flock.name if a.flock else "-",
            a.title,
            a.cause.name if a.cause else "-",
            (a.capa_action or "-")[:80],
            a.capa_responsible.get_username() if a.capa_responsible else "-",
            a.capa_due_date.strftime("%d.%m.%Y") if a.capa_due_date else "-",
            a.get_status_display(),
        ]
        for a in alerts
    ] or [["-", "-", "-", "-", "-", "-", "-", "Нет данных"]]
    return _build_pdf_table_response(
        title="CAPA-реестр инцидентов SmartPoultry",
        filename=f"smartpoultry_capa_{timezone.localdate()}.pdf",
        headers=[
            "Дата",
            "Стадо",
            "Инцидент",
            "Причина",
            "Действие",
            "Ответственный",
            "Срок",
            "Статус",
        ],
        rows=rows,
    )


@login_required
def auto_feed_settings(request):
    can_view = request.user.has_perm("smartpoultry.view_rationphase") or request.user.has_perm(
        "smartpoultry.view_feedstock"
    )
    can_edit = request.user.has_perm(
        "smartpoultry.change_rationphase"
    ) or request.user.has_perm("smartpoultry.change_feedautomationsettings")
    if not can_view and not can_edit:
        return HttpResponseForbidden("Недостаточно прав для настроек автосписания.")

    settings_obj = FeedAutomationSettings.get_solo()
    form = FeedAutomationSettingsForm(instance=settings_obj)
    if request.method == "POST":
        if not can_edit:
            return HttpResponseForbidden("Недостаточно прав для изменения настроек автосписания.")
        form = FeedAutomationSettingsForm(request.POST, instance=settings_obj)
        if form.is_valid():
            form.save()
            messages.success(request, "Настройки автосписания обновлены.")
            return redirect("auto_feed_settings")

    phases = RationPhase.objects.select_related("feed_type").order_by("cross_name", "start_week")
    return render(
        request,
        "smartpoultry/auto_feed_settings.html",
        {
            "form": form,
            "phases": phases,
            "can_edit": can_edit,
        },
    )


@login_required
def automation_settings(request):
    can_view = request.user.has_perm("smartpoultry.view_automationsettings") or is_owner(
        request.user
    )
    can_edit = request.user.has_perm("smartpoultry.change_automationsettings") or is_owner(
        request.user
    )
    if not can_view and not can_edit:
        return HttpResponseForbidden("Недостаточно прав для настроек автоматизации.")

    settings_obj = AutomationSettings.get_solo()
    form = AutomationSettingsForm(instance=settings_obj)
    if request.method == "POST":
        if not can_edit:
            return HttpResponseForbidden("Недостаточно прав для изменения настроек автоматизации.")
        form = AutomationSettingsForm(request.POST, instance=settings_obj)
        if form.is_valid():
            form.save()
            messages.success(request, "Настройки автоматизации обновлены.")
            return redirect("automation_settings")
    return render(
        request,
        "smartpoultry/automation_settings.html",
        {"form": form, "can_edit": can_edit},
    )


@login_required
def ration_phase_create(request):
    if not request.user.has_perm("smartpoultry.add_rationphase"):
        return HttpResponseForbidden("Недостаточно прав для добавления фазы рациона.")
    if request.method == "POST":
        form = RationPhaseForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Фаза рациона добавлена.")
            return redirect("auto_feed_settings")
    else:
        form = RationPhaseForm()
    return render(request, "smartpoultry/ration_phase_form.html", {"form": form})


@login_required
def ration_phase_update(request, phase_id):
    if not request.user.has_perm("smartpoultry.change_rationphase"):
        return HttpResponseForbidden("Недостаточно прав для изменения фазы рациона.")
    phase = get_object_or_404(RationPhase, id=phase_id)
    if request.method == "POST":
        form = RationPhaseForm(request.POST, instance=phase)
        if form.is_valid():
            form.save()
            messages.success(request, "Фаза рациона обновлена.")
            return redirect("auto_feed_settings")
    else:
        form = RationPhaseForm(instance=phase)
    return render(
        request,
        "smartpoultry/ration_phase_form.html",
        {"form": form, "phase": phase},
    )


@login_required
def warehouse_operations(request):
    can_view = request.user.has_perm("smartpoultry.view_feedstock")
    can_move = request.user.has_perm("smartpoultry.add_feedstockmovement")
    if not can_view and not can_move:
        return HttpResponseForbidden("Недостаточно прав для работы со складом.")

    incoming_form = FeedIncomingForm(prefix="incoming")
    adjust_form = FeedAdjustForm(prefix="adjust")

    if request.method == "POST":
        action = request.POST.get("action")
        if not can_move:
            return HttpResponseForbidden("Недостаточно прав для складовых операций.")

        if action == "incoming":
            incoming_form = FeedIncomingForm(request.POST, prefix="incoming")
            if incoming_form.is_valid():
                feed_type = incoming_form.cleaned_data["feed_type"]
                quantity_kg = incoming_form.cleaned_data["quantity_kg"]
                note = incoming_form.cleaned_data["note"] or "Ручной приход со склада"

                stock, _ = FeedStock.objects.get_or_create(feed_type=feed_type)
                stock.quantity_kg = Decimal(stock.quantity_kg) + Decimal(quantity_kg)
                stock.save(update_fields=["quantity_kg", "updated_at"])

                FeedStockMovement.objects.create(
                    feed_type=feed_type,
                    movement_type=FeedStockMovement.MovementType.IN,
                    quantity_kg=quantity_kg,
                    note=note,
                )
                messages.success(request, "Приход корма записан.")
                return redirect("warehouse_operations")

        if action == "adjust":
            adjust_form = FeedAdjustForm(request.POST, prefix="adjust")
            if adjust_form.is_valid():
                feed_type = adjust_form.cleaned_data["feed_type"]
                target_quantity = adjust_form.cleaned_data["target_quantity_kg"]
                note = adjust_form.cleaned_data["note"] or "Ручная корректировка остатка"

                stock, _ = FeedStock.objects.get_or_create(feed_type=feed_type)
                current_qty = Decimal(stock.quantity_kg)
                target_qty = Decimal(target_quantity)
                delta = target_qty - current_qty

                if delta == 0:
                    messages.info(request, "Остаток уже совпадает с фактическим значением.")
                    return redirect("warehouse_operations")

                movement_type = (
                    FeedStockMovement.MovementType.IN
                    if delta > 0
                    else FeedStockMovement.MovementType.OUT
                )
                FeedStockMovement.objects.create(
                    feed_type=feed_type,
                    movement_type=movement_type,
                    quantity_kg=abs(delta),
                    note=f"{note}. Было: {current_qty} кг, стало: {target_qty} кг",
                )
                stock.quantity_kg = target_qty
                stock.save(update_fields=["quantity_kg", "updated_at"])
                messages.success(request, "Корректировка остатка выполнена.")
                return redirect("warehouse_operations")

    period_days = request.GET.get("period_days", "7").strip()
    if period_days not in {"7", "30", "90"}:
        period_days = "7"
    period_start = timezone.localdate() - timedelta(days=int(period_days) - 1)

    feed_stocks = FeedStock.objects.select_related("feed_type").order_by("feed_type__name")
    recent_movements = FeedStockMovement.objects.select_related("feed_type", "flock").order_by(
        "-movement_date", "-created_at"
    )[:30]
    period_out = FeedStockMovement.objects.filter(
        movement_type=FeedStockMovement.MovementType.OUT,
        movement_date__range=[period_start, timezone.localdate()],
    ).select_related("feed_type")
    period_consumption_kg = Decimal("0.000")
    period_consumption_cost = Decimal("0.00")
    for movement in period_out:
        period_consumption_kg += Decimal(movement.quantity_kg)
        period_consumption_cost += Decimal(movement.quantity_kg) * Decimal(
            movement.feed_type.cost_per_kg
        )

    period_manual_expense = (
        FeedExpense.objects.filter(expense_date__range=[period_start, timezone.localdate()])
        .aggregate(v=Sum("amount"))
        .get("v")
        or Decimal("0.00")
    )
    return render(
        request,
        "smartpoultry/warehouse_operations.html",
        {
            "incoming_form": incoming_form,
            "adjust_form": adjust_form,
            "feed_stocks": feed_stocks,
            "recent_movements": recent_movements,
            "can_move": can_move,
            "period_days": period_days,
            "period_consumption_kg": period_consumption_kg.quantize(Decimal("0.001")),
            "period_consumption_cost": period_consumption_cost.quantize(Decimal("0.01")),
            "period_manual_expense": Decimal(period_manual_expense).quantize(Decimal("0.01")),
        },
    )


@login_required
def weekly_report_pdf(request):
    if not request.user.has_perm("smartpoultry.generate_report") and not is_owner(request.user):
        return HttpResponseForbidden("Недостаточно прав для генерации отчета.")

    today = timezone.localdate()
    week_start = today - timedelta(days=6)

    records = DailyProductionRecord.objects.filter(record_date__range=[week_start, today])
    weekly_totals = records.aggregate(c0=Sum("c0_count"), c1=Sum("c1_count"), c2=Sum("c2_count"))
    total_eggs = (weekly_totals.get("c0") or 0) + (weekly_totals.get("c1") or 0) + (
        weekly_totals.get("c2") or 0
    )

    total_initial = Flock.objects.filter(is_active=True).aggregate(total=Sum("initial_population")).get("total") or 0
    total_live = sum(flock.live_population(today) for flock in Flock.objects.filter(is_active=True))
    survival_rate = (total_live / total_initial * 100) if total_initial else 0
    incidents = Alert.objects.filter(created_at__date__range=[week_start, today]).order_by("-created_at")[:20]
    feed_stocks = FeedStock.objects.select_related("feed_type").order_by("feed_type__name")
    manual_feed_expense = (
        FeedExpense.objects.filter(expense_date__range=[week_start, today])
        .aggregate(v=Sum("amount"))
        .get("v")
        or Decimal("0.00")
    )
    auto_feed_cost = Decimal("0.00")
    week_feed_out = FeedStockMovement.objects.filter(
        movement_type=FeedStockMovement.MovementType.OUT,
        movement_date__range=[week_start, today],
    ).select_related("feed_type")
    for movement in week_feed_out:
        auto_feed_cost += Decimal(movement.quantity_kg) * Decimal(movement.feed_type.cost_per_kg)

    feed_rows = [[stock.feed_type.name, str(stock.quantity_kg)] for stock in feed_stocks]
    incident_rows = [
        [
            incident.created_at.strftime("%d.%m %H:%M"),
            incident.get_severity_display(),
            incident.flock.name if incident.flock else "-",
            incident.title,
        ]
        for incident in incidents
    ] or [["-", "-", "-", "Инцидентов за период нет"]]

    headers = [
        "Раздел",
        "Показатель",
        "Значение",
    ]
    rows = [
        ["Итоги", "Период", f"{week_start} - {today}"],
        ["Итоги", "Собрано яиц", total_eggs],
        ["Итоги", "Сохранность, %", f"{survival_rate:.2f}"],
        ["Экономика", "Авторасход корма, руб.", f"{auto_feed_cost.quantize(Decimal('0.01'))}"],
        ["Экономика", "Ручные расходы на корм, руб.", f"{Decimal(manual_feed_expense):.2f}"],
    ]
    rows.extend([["Склад", f"Корм: {name}", qty] for name, qty in feed_rows])
    rows.extend([["Инциденты", f"{d} | {sev} | {flock}", title] for d, sev, flock, title in incident_rows])

    return _build_pdf_table_response(
        title="SmartPoultry - Недельный отчет",
        filename=f"smartpoultry_weekly_{today}.pdf",
        headers=headers,
        rows=rows,
        subtitle=f"Сформировано: {timezone.localtime().strftime('%d.%m.%Y %H:%M')}",
    )
