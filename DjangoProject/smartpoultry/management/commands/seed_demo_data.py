from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
import random

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from smartpoultry.models import (
    Alert,
    Customer,
    DailyProductionRecord,
    EggCollectionMachine,
    FeedExpense,
    FeedStock,
    FeedType,
    Flock,
    IncidentCause,
    PoultryHouse,
    PurchaseRequest,
    Sale,
)
from smartpoultry.services import seed_reference_data


User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo operational data for local/dev usage."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=21,
            help="Number of past days for daily production records (default: 21).",
        )
        parser.add_argument(
            "--houses",
            type=int,
            default=3,
            help="Number of poultry houses to create (default: 3).",
        )
        parser.add_argument(
            "--flocks-per-house",
            type=int,
            default=2,
            help="Number of flocks in each house (default: 2).",
        )
        parser.add_argument(
            "--managers",
            type=int,
            default=2,
            help="Number of manager accounts to create/update (default: 2).",
        )
        parser.add_argument(
            "--cross",
            default="Lohmann",
            help="Cross name for flock standards/reference data (default: Lohmann).",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=42,
            help="Pseudo-random seed to keep generated data stable (default: 42).",
        )
        parser.add_argument(
            "--end-date",
            default="",
            help="Inclusive record end date in YYYY-MM-DD format (default: today).",
        )

    def handle(self, *args, **options):
        days = max(7, int(options["days"]))
        houses_count = max(1, int(options["houses"]))
        flocks_per_house = max(1, int(options["flocks_per_house"]))
        managers_count = max(1, int(options["managers"]))
        cross_name = options["cross"].strip() or "Lohmann"
        rng = random.Random(int(options["seed"]))
        end_date = timezone.localdate()
        end_date_raw = (options.get("end_date") or "").strip()
        if end_date_raw:
            try:
                end_date = date.fromisoformat(end_date_raw)
            except ValueError as exc:
                raise CommandError("Invalid --end-date. Expected YYYY-MM-DD.") from exc

        owner_group, _ = Group.objects.get_or_create(name="Owner")
        manager_group, _ = Group.objects.get_or_create(name="Manager")

        seed_reference_data(cross_name=cross_name)
        starter_feed = FeedType.objects.get(name="Старт")
        layer_feed = FeedType.objects.get(name="Несушка")

        manager_users: list[User] = []
        for idx in range(1, managers_count + 1):
            username = f"manager{idx}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "first_name": f"Менеджер {idx}",
                    "is_active": True,
                    "is_staff": True,
                },
            )
            if created:
                user.set_password("Manager123!")
            user.is_staff = True
            user.is_active = True
            user.first_name = user.first_name or f"Менеджер {idx}"
            user.save()
            user.groups.add(manager_group)
            manager_users.append(user)

        houses: list[PoultryHouse] = []
        for idx in range(1, houses_count + 1):
            manager = manager_users[(idx - 1) % len(manager_users)]
            house, _ = PoultryHouse.objects.update_or_create(
                code=f"H{idx:02d}",
                defaults={
                    "name": f"Корпус {idx}",
                    "responsible_manager": manager,
                    "is_active": True,
                    "note": "Сгенерировано командой seed_demo_data",
                },
            )
            houses.append(house)

        machines: list[EggCollectionMachine] = []
        for idx in range(1, 5):
            machine, _ = EggCollectionMachine.objects.update_or_create(
                serial_number=f"EGG-{idx:03d}",
                defaults={
                    "name": f"Линия сбора {idx}",
                    "is_active": True,
                    "note": "Заглушка интеграции с оборудованием",
                },
            )
            machines.append(machine)

        today = end_date
        flocks: list[Flock] = []
        for house_idx, house in enumerate(houses, start=1):
            for flock_idx in range(1, flocks_per_house + 1):
                placement_days_ago = 160 + (house_idx - 1) * 14 + flock_idx * 7
                placement_date = today - timedelta(days=placement_days_ago)
                name = f"Стадо {house_idx}-{flock_idx}"
                flock, _ = Flock.objects.update_or_create(
                    name=name,
                    defaults={
                        "house": house,
                        "batch_code": f"B{house_idx:02d}{flock_idx:02d}",
                        "cross_name": cross_name,
                        "placement_date": placement_date,
                        "initial_population": 4600 + house_idx * 180 + flock_idx * 90,
                        "is_active": True,
                    },
                )
                flocks.append(flock)

        for feed_type in (starter_feed, layer_feed):
            stock, _ = FeedStock.objects.get_or_create(feed_type=feed_type)
            if stock.quantity_kg <= Decimal("0.000"):
                stock.quantity_kg = Decimal("18000.000")
                stock.save(update_fields=["quantity_kg", "updated_at"])

        customers = []
        for idx in range(1, 8):
            customer, _ = Customer.objects.update_or_create(
                name=f"Покупатель {idx}",
                defaults={
                    "phone": f"+79000000{idx:02d}",
                    "email": f"client{idx}@example.com",
                    "note": "Тестовый клиент",
                },
            )
            customers.append(customer)

        causes = [
            "Пониженная яйценоскость",
            "Нарушение режима кормления",
            "Повышенный бой",
            "Корм на исходе",
        ]
        for cause_name in causes:
            IncidentCause.objects.get_or_create(name=cause_name, defaults={"note": "Тестовый справочник"})

        for day_offset in range(days):
            record_date = today - timedelta(days=day_offset)
            for flock in flocks:
                live_factor = Decimal("0.92") + Decimal(str(rng.uniform(0.00, 0.07)))
                live_population = int(Decimal(flock.initial_population) * live_factor)

                total_eggs = int(Decimal(live_population) * Decimal(str(rng.uniform(0.78, 0.90))))
                c0_count = int(total_eggs * 0.18)
                c1_count = int(total_eggs * 0.52)
                c2_count = max(0, total_eggs - c0_count - c1_count)

                broken_count = int(total_eggs * Decimal(str(rng.uniform(0.010, 0.035))))
                chipped_count = int(total_eggs * Decimal(str(rng.uniform(0.004, 0.016))))
                mortality_count = rng.randint(0, 6)

                DailyProductionRecord.objects.update_or_create(
                    flock=flock,
                    record_date=record_date,
                    defaults={
                        "machine": rng.choice(machines),
                        "c0_count": c0_count,
                        "c1_count": c1_count,
                        "c2_count": c2_count,
                        "broken_count": broken_count,
                        "chipped_count": chipped_count,
                        "mortality_count": mortality_count,
                    },
                )

        for flock in flocks:
            feed_type = layer_feed if flock.age_in_weeks(today) >= 20 else starter_feed

            for step in range(3):
                expense_date = today - timedelta(days=step * 5 + rng.randint(0, 2))
                quantity_kg = Decimal(str(900 + rng.randint(0, 1400)))
                amount = (quantity_kg * feed_type.cost_per_kg).quantize(Decimal("0.01"))

                FeedExpense.objects.update_or_create(
                    flock=flock,
                    expense_date=expense_date,
                    expense_type=FeedExpense.ExpenseType.FEED_PURCHASE,
                    defaults={
                        "house": flock.house,
                        "feed_type": feed_type,
                        "quantity_kg": quantity_kg,
                        "amount": amount,
                        "note": "Тестовая закупка корма",
                    },
                )

        status_cycle = [
            Sale.Status.NEW,
            Sale.Status.IN_PROGRESS,
            Sale.Status.PARTIAL_PAID,
            Sale.Status.OVERDUE,
            Sale.Status.COMPLETED,
        ]
        for idx in range(18):
            sale_date = today - timedelta(days=rng.randint(0, 20))
            flock = flocks[idx % len(flocks)]
            customer = customers[idx % len(customers)]

            c0_qty = rng.randint(350, 1100)
            c1_qty = rng.randint(900, 2200)
            c2_qty = rng.randint(450, 1400)

            sale, _ = Sale.objects.update_or_create(
                sale_date=sale_date,
                flock=flock,
                customer=customer,
                c0_qty=c0_qty,
                c1_qty=c1_qty,
                c2_qty=c2_qty,
                defaults={
                    "status": status_cycle[idx % len(status_cycle)],
                    "paid_amount": Decimal("0.00"),
                    "note": "Тестовая отгрузка",
                },
            )

            if sale.status == Sale.Status.COMPLETED:
                sale.paid_amount = sale.total_amount
            elif sale.status == Sale.Status.PARTIAL_PAID:
                sale.paid_amount = (sale.total_amount * Decimal("0.55")).quantize(Decimal("0.01"))
            elif sale.status == Sale.Status.OVERDUE:
                sale.paid_amount = Decimal("0.00")
            else:
                sale.paid_amount = (sale.total_amount * Decimal("0.25")).quantize(Decimal("0.01"))
            sale.save(update_fields=["paid_amount", "updated_at"])

        for idx in range(10):
            flock = flocks[idx % len(flocks)]
            feed_type = layer_feed if idx % 2 == 0 else starter_feed
            status = [
                PurchaseRequest.Status.PENDING,
                PurchaseRequest.Status.APPROVED,
                PurchaseRequest.Status.REJECTED,
                PurchaseRequest.Status.FULFILLED,
            ][idx % 4]
            requested_kg = Decimal(str(1500 + idx * 120))
            received_kg = requested_kg if status == PurchaseRequest.Status.FULFILLED else Decimal("0.000")

            PurchaseRequest.objects.update_or_create(
                flock=flock,
                feed_type=feed_type,
                requested_kg=requested_kg,
                status=status,
                defaults={
                    "received_kg": received_kg,
                    "days_to_zero": Decimal(str(2 + (idx % 7))),
                    "note": "Тестовая заявка",
                },
            )

        incidents = Alert.objects.filter(title__startswith="[DEMO]").count()
        if incidents < 6:
            for idx in range(6):
                flock = flocks[idx % len(flocks)]
                Alert.objects.create(
                    flock=flock,
                    alert_type=Alert.AlertType.BREAKAGE if idx % 2 else Alert.AlertType.EGG_DROP,
                    severity=Alert.Severity.WARNING if idx % 2 else Alert.Severity.CRITICAL,
                    status=Alert.Status.OPEN if idx % 3 else Alert.Status.RESOLVED,
                    title=f"[DEMO] Инцидент #{idx + 1}",
                    message="Тестовый инцидент для демонстрации карточек и фильтров.",
                )

        owners_count = User.objects.filter(groups=owner_group).count()
        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write(
            f"Houses={PoultryHouse.objects.count()}, flocks={Flock.objects.count()}, "
            f"records={DailyProductionRecord.objects.count()}, customers={Customer.objects.count()}, "
            f"sales={Sale.objects.count()}, purchase_requests={PurchaseRequest.objects.count()}, "
            f"managers={User.objects.filter(groups=manager_group).count()}, owners={owners_count}"
        )
        self.stdout.write("Manager passwords (new accounts): Manager123!")
