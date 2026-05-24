from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import (
    Alert,
    AutomationSettings,
    Customer,
    DailyFinanceSnapshot,
    DailyProductionRecord,
    EggCollectionMachine,
    EggPrice,
    EggProductionStandard,
    FeedStock,
    FeedStockMovement,
    FeedType,
    FeedExpense,
    FeedAutomationSettings,
    Flock,
    IncidentCause,
    PoultryHouse,
    PurchaseRequest,
    RationPhase,
    Sale,
)
from .services import process_predictive_flock_rotation, seed_reference_data

User = get_user_model()


def grant_permissions(user, codenames):
    permissions = Permission.objects.filter(codename__in=codenames)
    user.user_permissions.add(*permissions)


class BaseDataMixin:
    def create_owner(self):
        owner = User.objects.create_user(
            username="owner", password="Owner123!", is_staff=True, is_active=True
        )
        owner_group, _ = Group.objects.get_or_create(name="Owner")
        owner.groups.add(owner_group)
        return owner

    def create_manager(self, username="manager", password="Manager123!"):
        manager = User.objects.create_user(
            username=username, password=password, is_staff=True, is_active=True
        )
        manager_group, _ = Group.objects.get_or_create(name="Manager")
        manager.groups.add(manager_group)
        return manager

    def create_base_flock(self):
        idx = PoultryHouse.objects.count() + 1
        house = PoultryHouse.objects.create(name=f"Корпус {idx}", code=f"H{idx}")
        flock = Flock.objects.create(
            name="Flock A",
            cross_name="Lohmann",
            house=house,
            batch_code="B-001",
            placement_date=timezone.localdate() - timedelta(weeks=25),
            initial_population=1000,
        )
        return flock


class ProductionAutomationTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.flock = self.create_base_flock()
        EggProductionStandard.objects.create(
            cross_name="Lohmann",
            week_number=25,
            target_efficiency_percent=90,
        )
        self.feed_type = FeedType.objects.create(name="Layer", cost_per_kg=20)
        FeedStock.objects.create(feed_type=self.feed_type, quantity_kg=1000)
        RationPhase.objects.create(
            cross_name="Lohmann",
            name="Layer phase",
            start_week=20,
            end_week=80,
            daily_consumption_g=115,
            feed_type=self.feed_type,
        )
        EggPrice.objects.create(category=EggPrice.EggCategory.C0, price_per_egg=10)
        EggPrice.objects.create(category=EggPrice.EggCategory.C1, price_per_egg=8)
        EggPrice.objects.create(category=EggPrice.EggCategory.C2, price_per_egg=6)

    def test_creates_alerts_feed_movement_and_finance_snapshot(self):
        record = DailyProductionRecord.objects.create(
            flock=self.flock,
            record_date=timezone.localdate(),
            c0_count=200,
            c1_count=200,
            c2_count=200,
            broken_count=30,
            chipped_count=5,
            mortality_count=10,
        )
        self.assertTrue(
            Alert.objects.filter(
                related_record=record,
                alert_type=Alert.AlertType.EGG_DROP,
                status=Alert.Status.OPEN,
            ).exists()
        )
        self.assertTrue(
            Alert.objects.filter(
                related_record=record,
                alert_type=Alert.AlertType.BREAKAGE,
                status=Alert.Status.OPEN,
            ).exists()
        )
        self.assertTrue(
            FeedStockMovement.objects.filter(
                flock=self.flock,
                movement_type=FeedStockMovement.MovementType.OUT,
                movement_date=record.record_date,
            ).exists()
        )
        self.assertTrue(
            DailyFinanceSnapshot.objects.filter(
                flock=self.flock,
                snapshot_date=record.record_date,
            ).exists()
        )

    def test_rolling_average_anomaly_alert_created(self):
        base_date = timezone.localdate() - timedelta(days=6)
        for i in range(5):
            DailyProductionRecord.objects.create(
                flock=self.flock,
                record_date=base_date + timedelta(days=i),
                c0_count=300,
                c1_count=250,
                c2_count=200,
                broken_count=1,
                chipped_count=0,
                mortality_count=1,
            )
        current = DailyProductionRecord.objects.create(
            flock=self.flock,
            record_date=base_date + timedelta(days=5),
            c0_count=120,
            c1_count=100,
            c2_count=90,
            broken_count=1,
            chipped_count=0,
            mortality_count=12,
        )
        self.assertTrue(
            Alert.objects.filter(
                flock=self.flock,
                related_record=current,
                alert_type=Alert.AlertType.PRODUCTION_ANOMALY,
                status=Alert.Status.OPEN,
            ).exists()
        )

    def test_predictive_rotation_alert_created_on_negative_forecast(self):
        start = timezone.localdate() - timedelta(days=10)
        for i in range(7):
            DailyFinanceSnapshot.objects.update_or_create(
                flock=self.flock,
                snapshot_date=start + timedelta(days=i),
                defaults={
                    "revenue": Decimal("1000.00") - Decimal(i * 50),
                    "feed_cost": Decimal("950.00") + Decimal(i * 20),
                    "gross_profit": Decimal("50.00") - Decimal(i * 70),
                },
            )
        record = DailyProductionRecord.objects.create(
            flock=self.flock,
            record_date=timezone.localdate(),
            c0_count=220,
            c1_count=200,
            c2_count=190,
            broken_count=2,
            chipped_count=0,
            mortality_count=1,
        )
        DailyFinanceSnapshot.objects.update_or_create(
            flock=self.flock,
            snapshot_date=record.record_date,
            defaults={
                "revenue": Decimal("100.00"),
                "feed_cost": Decimal("500.00"),
                "gross_profit": Decimal("-400.00"),
            },
        )
        process_predictive_flock_rotation(record)
        self.assertTrue(
            Alert.objects.filter(
                flock=self.flock,
                alert_type=Alert.AlertType.FLOCK_ROTATION,
                status=Alert.Status.OPEN,
            ).exists()
        )


class AuthAndAccessTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.owner = self.create_owner()
        self.manager = self.create_manager()

    def test_login_invalid_credentials_shows_russian_error(self):
        response = self.client.post(reverse("login"), {"username": "x", "password": "y"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Неверный логин или пароль")

    def test_manager_login_redirects_to_first_allowed_screen(self):
        grant_permissions(self.manager, ["add_dailyproductionrecord"])
        response = self.client.post(
            reverse("login"),
            {"username": "manager", "password": "Manager123!"},
            follow=False,
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/records/new/")

    def test_setup_wizard_denied_for_non_owner(self):
        self.client.login(username="manager", password="Manager123!")
        response = self.client.get(reverse("setup_wizard", kwargs={"step": 1}))
        self.assertIn(response.status_code, (302, 403))

    def test_malformed_encoded_login_url_redirects_to_normal_login(self):
        response = self.client.get("/login/%3Fnext=/records/new/", follow=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/login/?next=/records/new/")

        response_double = self.client.get("/login/%253Fnext%253D/records/new/", follow=False)
        self.assertEqual(response_double.status_code, 302)
        self.assertEqual(response_double.headers["Location"], "/login/?next=/records/new/")


class WarehouseAndPurchaseFlowTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.owner = self.create_owner()
        self.manager = self.create_manager()
        self.flock = self.create_base_flock()
        seed_reference_data("Lohmann")
        self.feed_type = FeedType.objects.get(name="Несушка")
        FeedStock.objects.update_or_create(
            feed_type=self.feed_type, defaults={"quantity_kg": Decimal("100.000")}
        )
        self.purchase_request = PurchaseRequest.objects.create(
            flock=self.flock,
            feed_type=self.feed_type,
            requested_kg=Decimal("50.000"),
            days_to_zero=Decimal("5.00"),
            status=PurchaseRequest.Status.PENDING,
            note="Тестовая заявка",
        )

    def test_purchase_approval_requires_permission(self):
        self.client.login(username="manager", password="Manager123!")
        response = self.client.post(
            reverse(
                "purchase_request_decision",
                kwargs={"request_id": self.purchase_request.id, "decision": "approve"},
            )
        )
        self.assertEqual(response.status_code, 403)

    def test_approved_request_can_be_received_and_fulfilled(self):
        grant_permissions(self.manager, ["view_purchaserequest", "add_feedstockmovement"])
        self.purchase_request.status = PurchaseRequest.Status.APPROVED
        self.purchase_request.save(update_fields=["status"])

        self.client.login(username="manager", password="Manager123!")
        response = self.client.post(
            reverse("purchase_receipt"),
            {
                "purchase_request": self.purchase_request.id,
                "received_kg": "50.000",
                "note": "Приемка тест",
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.purchase_request.refresh_from_db()
        self.assertEqual(self.purchase_request.status, PurchaseRequest.Status.FULFILLED)
        self.assertEqual(self.purchase_request.remaining_kg, Decimal("0.000"))
        stock = FeedStock.objects.get(feed_type=self.feed_type)
        self.assertEqual(stock.quantity_kg, Decimal("150.000"))
        self.assertTrue(
            FeedStockMovement.objects.filter(
                feed_type=self.feed_type,
                movement_type=FeedStockMovement.MovementType.IN,
                quantity_kg=Decimal("50.000"),
            ).exists()
        )

    def test_warehouse_screen_access_by_permission(self):
        self.client.login(username="manager", password="Manager123!")
        denied = self.client.get(reverse("warehouse_operations"))
        self.assertEqual(denied.status_code, 403)

        grant_permissions(self.manager, ["view_feedstock"])
        allowed = self.client.get(reverse("warehouse_operations"))
        self.assertEqual(allowed.status_code, 200)

    def test_manual_purchase_request_create(self):
        grant_permissions(self.manager, ["add_purchaserequest", "view_purchaserequest"])
        self.client.login(username="manager", password="Manager123!")
        response = self.client.post(
            reverse("purchase_request_create"),
            {
                "flock": self.flock.id,
                "feed_type": self.feed_type.id,
                "requested_kg": "80.000",
                "note": "Ручная заявка",
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            PurchaseRequest.objects.filter(
                flock=self.flock,
                feed_type=self.feed_type,
                requested_kg=Decimal("80.000"),
            ).exists()
        )


class ExportAndPrintTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.manager = self.create_manager()
        self.flock = self.create_base_flock()
        self.feed_type = FeedType.objects.create(name="Layer", cost_per_kg=Decimal("20.00"))
        self.alert = Alert.objects.create(
            flock=self.flock,
            alert_type=Alert.AlertType.BREAKAGE,
            severity=Alert.Severity.WARNING,
            status=Alert.Status.OPEN,
            title="Тестовый инцидент",
            message="Тест",
        )
        self.request_item = PurchaseRequest.objects.create(
            flock=self.flock,
            feed_type=self.feed_type,
            requested_kg=Decimal("25.000"),
            days_to_zero=Decimal("3.00"),
            status=PurchaseRequest.Status.PENDING,
        )

    def test_incident_and_purchase_exports_require_permissions(self):
        self.client.login(username="manager", password="Manager123!")
        self.assertEqual(self.client.get(reverse("incidents_export_pdf")).status_code, 403)
        self.assertEqual(self.client.get(reverse("purchase_requests_export_pdf")).status_code, 403)

        grant_permissions(self.manager, ["view_alert", "view_purchaserequest"])
        ok_inc = self.client.get(reverse("incidents_export_pdf"))
        ok_req = self.client.get(reverse("purchase_requests_export_pdf"))
        self.assertEqual(ok_inc.status_code, 200)
        self.assertEqual(ok_inc["Content-Type"], "application/pdf")
        self.assertEqual(ok_req.status_code, 200)
        self.assertEqual(ok_req["Content-Type"], "application/pdf")

    def test_incident_status_update_and_single_pdf(self):
        self.client.login(username="manager", password="Manager123!")
        denied = self.client.post(
            reverse("incident_status_update", kwargs={"incident_id": self.alert.id}),
            {"status": Alert.Status.RESOLVED},
        )
        self.assertEqual(denied.status_code, 403)

        grant_permissions(self.manager, ["change_alert", "view_alert"])
        updated = self.client.post(
            reverse("incident_status_update", kwargs={"incident_id": self.alert.id}),
            {"status": Alert.Status.RESOLVED},
            follow=True,
        )
        self.assertEqual(updated.status_code, 200)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, Alert.Status.RESOLVED)

        single_pdf = self.client.get(
            reverse("incident_export_pdf", kwargs={"incident_id": self.alert.id})
        )
        self.assertEqual(single_pdf.status_code, 200)
        self.assertEqual(single_pdf["Content-Type"], "application/pdf")

    def test_filters_for_incidents_and_requests(self):
        grant_permissions(self.manager, ["view_alert", "view_purchaserequest"])
        self.client.login(username="manager", password="Manager123!")

        inc_resp = self.client.get(reverse("incidents_list"), {"status": Alert.Status.OPEN})
        self.assertEqual(inc_resp.status_code, 200)
        self.assertContains(inc_resp, "Тестовый инцидент")

        req_resp = self.client.get(
            reverse("purchase_request_list"),
            {"status": PurchaseRequest.Status.PENDING},
        )
        self.assertEqual(req_resp.status_code, 200)


class SalesKpiAndCapaTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.owner = self.create_owner()
        self.manager = self.create_manager()
        self.flock = self.create_base_flock()
        self.customer = Customer.objects.create(name="Клиент А")
        Sale.objects.create(
            flock=self.flock,
            customer=self.customer,
            c0_qty=10,
            c1_qty=5,
            c2_qty=0,
            paid_amount=Decimal("50.00"),
        )
        self.alert = Alert.objects.create(
            flock=self.flock,
            alert_type=Alert.AlertType.BREAKAGE,
            severity=Alert.Severity.WARNING,
            status=Alert.Status.OPEN,
            title="Инцидент CAPA",
            message="Тестовый инцидент",
        )

    def test_sales_and_kpi_pages(self):
        grant_permissions(self.manager, ["view_sale", "view_dashboard", "change_sale"])
        self.client.login(username="manager", password="Manager123!")
        sales_resp = self.client.get(reverse("sales_list"))
        self.assertEqual(sales_resp.status_code, 200)
        kpi_resp = self.client.get(reverse("kpi_dashboard"))
        self.assertEqual(kpi_resp.status_code, 200)
        sale = Sale.objects.first()
        status_resp = self.client.post(
            reverse("sale_status_update", kwargs={"sale_id": sale.id}),
            {"status": Sale.Status.IN_PROGRESS},
            follow=True,
        )
        self.assertEqual(status_resp.status_code, 200)
        sale.refresh_from_db()
        self.assertEqual(sale.status, Sale.Status.IN_PROGRESS)

    def test_capa_update(self):
        grant_permissions(self.manager, ["change_alert", "view_alert"])
        cause = IncidentCause.objects.create(name="Стресс")
        self.client.login(username="manager", password="Manager123!")
        response = self.client.post(
            reverse("incident_capa_update", kwargs={"incident_id": self.alert.id}),
            {
                "status": Alert.Status.RESOLVED,
                "cause": cause.id,
                "capa_action": "Проверить вентиляцию",
                "capa_responsible": self.manager.id,
                "capa_due_date": timezone.localdate().isoformat(),
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.status, Alert.Status.RESOLVED)
        self.assertEqual(self.alert.cause, cause)
        self.assertTrue(bool(self.alert.capa_action))

    def test_customers_list_and_update(self):
        grant_permissions(self.manager, ["view_customer", "change_customer", "add_customer"])
        self.client.login(username="manager", password="Manager123!")
        list_resp = self.client.get(reverse("customer_list"))
        self.assertEqual(list_resp.status_code, 200)
        self.assertContains(list_resp, "Клиент А")
        edit_resp = self.client.post(
            reverse("customer_update", kwargs={"customer_id": self.customer.id}),
            {
                "name": "Клиент АА",
                "phone": "123",
                "email": "a@test.local",
                "note": "обновлен",
            },
            follow=True,
        )
        self.assertEqual(edit_resp.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.name, "Клиент АА")

    def test_overdue_receivable_command(self):
        settings = AutomationSettings.get_solo()
        settings.receivable_overdue_days = 3
        settings.save(update_fields=["receivable_overdue_days", "updated_at"])
        sale = Sale.objects.create(
            flock=self.flock,
            customer=self.customer,
            sale_date=timezone.localdate() - timedelta(days=4),
            c0_qty=50,
            c1_qty=0,
            c2_qty=0,
            paid_amount=Decimal("100.00"),
            status=Sale.Status.PARTIAL_PAID,
        )
        call_command("check_overdue_sales")
        sale.refresh_from_db()
        self.assertEqual(sale.status, Sale.Status.OVERDUE)
        alert = Alert.objects.filter(
            alert_type=Alert.AlertType.RECEIVABLE_OVERDUE,
            status=Alert.Status.OPEN,
        ).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.related_sale_id, sale.id)
        self.assertIn("Счет на доплату доступен", alert.message)
        self.assertNotIn("generated_reports", alert.message)

    def test_overdue_incident_notice_pdf_download(self):
        sale = Sale.objects.create(
            flock=self.flock,
            customer=self.customer,
            sale_date=timezone.localdate() - timedelta(days=10),
            c0_qty=12,
            c1_qty=5,
            c2_qty=2,
            paid_amount=Decimal("0.00"),
            status=Sale.Status.OVERDUE,
        )
        alert = Alert.objects.create(
            flock=self.flock,
            related_sale=sale,
            alert_type=Alert.AlertType.RECEIVABLE_OVERDUE,
            severity=Alert.Severity.WARNING,
            status=Alert.Status.OPEN,
            title=f"Просроченная дебиторка по продаже #{sale.id}",
            message="Тестовое уведомление",
        )

        grant_permissions(self.manager, ["view_alert"])
        self.client.login(username="manager", password="Manager123!")
        response = self.client.get(
            reverse("incident_overdue_notice_pdf", kwargs={"incident_id": alert.id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")


class FeedManagementAndHouseLinksTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.owner = self.create_owner()
        self.manager = self.create_manager()
        self.house = PoultryHouse.objects.create(
            name="Корпус Тест",
            code="HT1",
            responsible_manager=self.manager,
        )
        self.flock = Flock.objects.create(
            name="Стадо Тест",
            cross_name="Lohmann",
            house=self.house,
            placement_date=timezone.localdate() - timedelta(weeks=30),
            initial_population=1000,
        )
        self.feed_type = FeedType.objects.create(name="Комбикорм Тест", cost_per_kg=Decimal("25.00"))

    def test_feed_type_and_feed_expense_pages(self):
        grant_permissions(
            self.manager,
            [
                "view_feedtype",
                "add_feedtype",
                "change_feedtype",
                "view_feedexpense",
                "add_feedexpense",
                "change_feedexpense",
                "delete_feedexpense",
                "view_feedstock",
            ],
        )
        self.client.login(username="manager", password="Manager123!")

        feed_type_page = self.client.get(reverse("feed_type_list"))
        self.assertEqual(feed_type_page.status_code, 200)
        self.assertContains(feed_type_page, "Комбикорм Тест")

        create_expense = self.client.post(
            reverse("feed_expense_create"),
            {
                "expense_date": timezone.localdate().isoformat(),
                "house": self.house.id,
                "flock": self.flock.id,
                "feed_type": self.feed_type.id,
                "expense_type": FeedExpense.ExpenseType.FEED_PURCHASE,
                "quantity_kg": "120.000",
                "amount": "3000.00",
                "note": "Тестовая закупка",
            },
            follow=True,
        )
        self.assertEqual(create_expense.status_code, 200)
        self.assertTrue(FeedExpense.objects.filter(flock=self.flock, amount=Decimal("3000.00")).exists())
        expense = FeedExpense.objects.get(flock=self.flock, amount=Decimal("3000.00"))

        expense_page = self.client.get(reverse("feed_expense_list"), {"house_id": self.house.id})
        self.assertEqual(expense_page.status_code, 200)
        self.assertContains(expense_page, "Тестовая закупка")

        update_expense = self.client.post(
            reverse("feed_expense_update", kwargs={"expense_id": expense.id}),
            {
                "expense_date": timezone.localdate().isoformat(),
                "house": self.house.id,
                "flock": self.flock.id,
                "feed_type": self.feed_type.id,
                "expense_type": FeedExpense.ExpenseType.TRANSPORT,
                "quantity_kg": "120.000",
                "amount": "3500.00",
                "note": "Тестовая доставка",
            },
            follow=True,
        )
        self.assertEqual(update_expense.status_code, 200)
        expense.refresh_from_db()
        self.assertEqual(expense.amount, Decimal("3500.00"))

        expense_pdf = self.client.get(reverse("feed_expenses_export_pdf"))
        self.assertEqual(expense_pdf.status_code, 200)
        self.assertEqual(expense_pdf["Content-Type"], "application/pdf")

        expense_xlsx = self.client.get(reverse("feed_expenses_export_excel"))
        self.assertEqual(expense_xlsx.status_code, 200)
        self.assertIn(
            expense_xlsx["Content-Type"],
            [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/csv; charset=utf-8",
            ],
        )

        warehouse_xlsx = self.client.get(reverse("warehouse_export_excel"))
        self.assertEqual(warehouse_xlsx.status_code, 200)
        self.assertIn(
            warehouse_xlsx["Content-Type"],
            [
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/csv; charset=utf-8",
            ],
        )

        delete_expense = self.client.post(
            reverse("feed_expense_delete", kwargs={"expense_id": expense.id}),
            follow=True,
        )
        self.assertEqual(delete_expense.status_code, 200)
        self.assertFalse(FeedExpense.objects.filter(id=expense.id).exists())

    def test_house_binding_visible(self):
        grant_permissions(self.manager, ["view_poultryhouse"])
        self.client.login(username="manager", password="Manager123!")
        response = self.client.get(reverse("poultry_house_list"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Корпус Тест")
        self.assertContains(response, "manager")

    def test_auto_feed_settings_page_and_toggle(self):
        grant_permissions(
            self.manager,
            ["view_rationphase", "change_rationphase", "change_feedautomationsettings", "view_feedstock"],
        )
        self.client.login(username="manager", password="Manager123!")
        settings_page = self.client.get(reverse("auto_feed_settings"))
        self.assertEqual(settings_page.status_code, 200)

        response = self.client.post(
            reverse("auto_feed_settings"),
            {"low_stock_days_threshold": "5.00"},
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        settings_obj = FeedAutomationSettings.get_solo()
        self.assertFalse(settings_obj.enabled)
        self.assertEqual(settings_obj.low_stock_days_threshold, Decimal("5.00"))

    def test_automation_settings_page(self):
        grant_permissions(self.manager, ["view_automationsettings", "change_automationsettings"])
        self.client.login(username="manager", password="Manager123!")
        page = self.client.get(reverse("automation_settings"))
        self.assertEqual(page.status_code, 200)
        response = self.client.post(
            reverse("automation_settings"),
            {
                "egg_drop_threshold_pct": "6.00",
                "breakage_threshold_pct": "4.00",
                "anomaly_egg_drop_threshold_pct": "6.00",
                "anomaly_mortality_multiplier": "1.60",
                "anomaly_mortality_rate_threshold_pct": "0.60",
                "rotation_forecast_days": "10",
                "rotation_min_history_days": "4",
                "rotation_negative_margin_threshold": "-100.00",
                "receivable_overdue_days": "5",
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        settings_obj = AutomationSettings.get_solo()
        self.assertEqual(settings_obj.egg_drop_threshold_pct, Decimal("6.00"))
        self.assertEqual(settings_obj.receivable_overdue_days, 5)

    def test_egg_dashboard_and_standard_fallback(self):
        grant_permissions(
            self.manager,
            ["view_dashboard", "view_eggproductionstandard", "change_eggproductionstandard"],
        )
        EggProductionStandard.objects.create(
            cross_name="Lohmann",
            week_number=80,
            target_efficiency_percent=Decimal("82.00"),
        )
        DailyProductionRecord.objects.create(
            flock=self.flock,
            record_date=timezone.localdate(),
            c0_count=300,
            c1_count=200,
            c2_count=100,
            mortality_count=0,
        )
        self.client.login(username="manager", password="Manager123!")
        response = self.client.get(reverse("egg_dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Яйценоскость по корпусам и стадам")
        self.assertContains(response, "82")


class DailyRecordsWorkflowTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.manager = self.create_manager()
        self.flock = self.create_base_flock()
        self.machine = EggCollectionMachine.objects.create(
            name="Линия 1",
            serial_number="EGG-TST-001",
            is_active=True,
        )
        self.record_date = timezone.localdate()
        self.record = DailyProductionRecord.objects.create(
            flock=self.flock,
            machine=self.machine,
            record_date=self.record_date,
            c0_count=100,
            c1_count=90,
            c2_count=80,
            broken_count=2,
            chipped_count=1,
            mortality_count=0,
        )

    def test_daily_record_list_and_duplicate_redirect_to_edit(self):
        grant_permissions(
            self.manager,
            [
                "add_dailyproductionrecord",
                "view_dailyproductionrecord",
                "change_dailyproductionrecord",
            ],
        )
        self.client.login(username="manager", password="Manager123!")

        list_response = self.client.get(reverse("daily_record_list"))
        self.assertEqual(list_response.status_code, 200)
        self.assertContains(list_response, self.flock.name)

        duplicate_response = self.client.post(
            reverse("daily_record_create"),
            {
                "flock": self.flock.id,
                "machine": self.machine.id,
                "record_date": self.record_date.isoformat(),
                "c0_count": 120,
                "c1_count": 100,
                "c2_count": 90,
                "broken_count": 1,
                "chipped_count": 0,
                "mortality_count": 0,
            },
            follow=True,
        )
        self.assertEqual(duplicate_response.status_code, 200)
        self.assertContains(duplicate_response, "Редактирование дневной записи")

    def test_daily_record_update_changes_existing_record(self):
        grant_permissions(
            self.manager,
            [
                "view_dailyproductionrecord",
                "change_dailyproductionrecord",
            ],
        )
        self.client.login(username="manager", password="Manager123!")

        response = self.client.post(
            reverse("daily_record_update", kwargs={"record_id": self.record.id}),
            {
                "flock": self.flock.id,
                "machine": self.machine.id,
                "record_date": self.record_date.isoformat(),
                "c0_count": 140,
                "c1_count": 130,
                "c2_count": 120,
                "broken_count": 3,
                "chipped_count": 1,
                "mortality_count": 1,
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        self.record.refresh_from_db()
        self.assertEqual(self.record.c0_count, 140)
        self.assertEqual(self.record.machine_id, self.machine.id)


class MachinesStubIntegrationTests(BaseDataMixin, TestCase):
    def setUp(self):
        self.owner = self.create_owner()
        self.manager = self.create_manager()

    def test_machine_pages_and_daily_record_binding(self):
        grant_permissions(
            self.manager,
            [
                "view_eggcollectionmachine",
                "add_eggcollectionmachine",
                "change_eggcollectionmachine",
                "add_dailyproductionrecord",
                "view_dailyproductionrecord",
                "change_dailyproductionrecord",
            ],
        )
        flock = self.create_base_flock()
        self.client.login(username="manager", password="Manager123!")

        create_machine = self.client.post(
            reverse("machine_create"),
            {
                "name": "Линия 7",
                "serial_number": "EGG-007",
                "is_active": "on",
                "note": "Тестовая заглушка",
            },
            follow=True,
        )
        self.assertEqual(create_machine.status_code, 200)
        machine = EggCollectionMachine.objects.get(serial_number="EGG-007")

        list_machine = self.client.get(reverse("machine_list"))
        self.assertEqual(list_machine.status_code, 200)
        self.assertContains(list_machine, "Линия 7")

        create_record = self.client.post(
            reverse("daily_record_create"),
            {
                "flock": flock.id,
                "machine": machine.id,
                "record_date": timezone.localdate().isoformat(),
                "c0_count": 50,
                "c1_count": 40,
                "c2_count": 30,
                "broken_count": 1,
                "chipped_count": 0,
                "mortality_count": 0,
            },
            follow=True,
        )
        self.assertEqual(create_record.status_code, 200)
        record = DailyProductionRecord.objects.get(flock=flock, record_date=timezone.localdate())
        self.assertEqual(record.machine_id, machine.id)
