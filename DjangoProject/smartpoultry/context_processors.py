def ui_permissions(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return {"ui_perms": {}}

    is_owner = user.is_superuser or user.groups.filter(name="Owner").exists()

    def has(code):
        return is_owner or user.has_perm(code)

    data = {
        "is_owner": is_owner,
        "can_dashboard": has("smartpoultry.view_dashboard"),
        "can_daily_record": has("smartpoultry.add_dailyproductionrecord"),
        "can_egg": has("smartpoultry.view_dashboard")
        or has("smartpoultry.view_eggproductionstandard")
        or has("smartpoultry.add_eggproductionstandard")
        or has("smartpoultry.change_eggproductionstandard"),
        "can_kpi": has("smartpoultry.view_dashboard"),
        "can_incidents": has("smartpoultry.view_alert")
        or has("smartpoultry.change_alert")
        or has("smartpoultry.view_incidentcause"),
        "can_incident_causes": has("smartpoultry.view_incidentcause")
        or has("smartpoultry.add_incidentcause"),
        "can_sales": has("smartpoultry.view_sale")
        or has("smartpoultry.add_sale")
        or has("smartpoultry.change_sale"),
        "can_customers": has("smartpoultry.view_customer")
        or has("smartpoultry.add_customer")
        or has("smartpoultry.change_customer"),
        "can_warehouse": has("smartpoultry.view_feedstock")
        or has("smartpoultry.add_feedstockmovement")
        or has("smartpoultry.view_feedtype")
        or has("smartpoultry.add_feedtype")
        or has("smartpoultry.view_feedexpense")
        or has("smartpoultry.add_feedexpense")
        or has("smartpoultry.view_purchaserequest")
        or has("smartpoultry.add_purchaserequest")
        or has("smartpoultry.approve_purchaserequest")
        or has("smartpoultry.view_rationphase")
        or has("smartpoultry.view_feedautomationsettings"),
        "can_purchase_requests": has("smartpoultry.view_purchaserequest")
        or has("smartpoultry.add_purchaserequest")
        or has("smartpoultry.approve_purchaserequest"),
        "can_purchase_receipt": has("smartpoultry.view_purchaserequest")
        and has("smartpoultry.add_feedstockmovement"),
        "can_feed_types": has("smartpoultry.view_feedtype") or has("smartpoultry.add_feedtype"),
        "can_feed_expenses": has("smartpoultry.view_feedexpense")
        or has("smartpoultry.add_feedexpense"),
        "can_auto_feed_settings": has("smartpoultry.view_rationphase")
        or has("smartpoultry.view_feedautomationsettings"),
        "can_admin": is_owner,
        "can_managers": is_owner,
        "can_houses": is_owner or has("smartpoultry.view_poultryhouse"),
        "can_automation_settings": is_owner
        or has("smartpoultry.view_automationsettings")
        or has("smartpoultry.change_automationsettings"),
    }
    return {"ui_perms": data}
