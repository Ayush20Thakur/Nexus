from __future__ import annotations

from app.database.seed import dataset_counts


def test_seed_dataset_covers_operational_domains() -> None:
    counts = dataset_counts()
    assert counts["users"] == 6
    assert counts["inventory_items"] == 25
    assert counts["operational_requests"] == 25
    assert counts["approvals"] == 13
    assert counts["fulfillment_orders"] == 13
    assert counts["decision_rules"] >= 4
    assert counts["reports"] == 10
