"""Unit and integration tests for Analytics repository, service, and API endpoints (Milestone 07)."""

import datetime
import uuid
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token, get_password_hash
from backend.app.models.enums import PickupStatus, ReportPriority, ReportStatus, UserRole, WasteCategory
from backend.app.models.pickup import Pickup
from backend.app.models.report import WasteReport
from backend.app.models.user import User
from backend.app.repositories.analytics_repository import AnalyticsRepository
from backend.app.schemas.analytics import TimeRangeEnum, TrendIntervalEnum


def _create_user(db: Session, role: UserRole, prefix: str) -> tuple[User, str]:
    """Helper to create a test user and JWT token."""
    unique_email = f"{prefix}_{uuid.uuid4().hex[:8]}@test.com"
    user = User(
        name=f"Test {role.value.title()}",
        email=unique_email,
        password_hash=get_password_hash("password123"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(subject=str(user.id), role=role.value)
    return user, token


# ==============================================================================
# REPOSITORY LEVEL TESTS
# ==============================================================================

def test_analytics_repository_calculations_and_structure(db_session: Session):
    """Verify repository methods return expected structure, valid calculations, and no errors."""
    repo = AnalyticsRepository(db_session)

    # Overview metrics
    overview = repo.get_overview_metrics()
    assert isinstance(overview["total_reports"], int)
    assert isinstance(overview["resolved_reports"], int)
    assert isinstance(overview["resolution_rate"], float)
    assert 0.0 <= overview["resolution_rate"] <= 100.0
    assert isinstance(overview["total_pickups"], int)
    assert isinstance(overview["completed_pickups"], int)
    assert isinstance(overview["pickup_completion_rate"], float)
    assert 0.0 <= overview["pickup_completion_rate"] <= 100.0
    assert isinstance(overview["avg_resolution_turnaround_hours"], float)
    assert isinstance(overview["active_collectors"], int)
    assert isinstance(overview["active_citizens"], int)

    # Category metrics
    cat_data = repo.get_category_metrics()
    assert isinstance(cat_data["total_reports"], int)
    assert len(cat_data["categories"]) == len(WasteCategory)
    total_cat_reports = sum(c["report_count"] for c in cat_data["categories"])
    assert total_cat_reports == cat_data["total_reports"]

    for cat_item in cat_data["categories"]:
        assert 0.0 <= cat_item["percentage"] <= 100.0
        assert 0.0 <= cat_item["resolution_rate"] <= 100.0
        if cat_item["report_count"] > 0:
            assert cat_item["resolved_count"] <= cat_item["report_count"]

    # Trend metrics
    trends = repo.get_trend_metrics(interval=TrendIntervalEnum.DAY)
    assert len(trends) > 0
    for dp in trends:
        assert "timestamp" in dp
        assert "label" in dp
        assert dp["submitted_reports"] >= 0
        assert dp["resolved_reports"] >= 0
        assert dp["requested_pickups"] >= 0
        assert dp["completed_pickups"] >= 0

    # Collector performance
    collector_perf = repo.get_collector_performance()
    assert isinstance(collector_perf, list)
    for col in collector_perf:
        assert "collector_id" in col
        assert "name" in col
        assert "assigned_reports" in col
        assert "resolved_reports" in col
        assert 0.0 <= col["resolution_rate"] <= 100.0
        assert col["avg_completion_time_hours"] >= 0.0


def test_analytics_repository_with_newly_seeded_data(db_session: Session):
    """Verify that adding new reports, pickups and collectors correctly reflects in the metrics."""
    now = datetime.datetime.now(datetime.timezone.utc)
    one_day_ago = now - datetime.timedelta(days=1)
    two_days_ago = now - datetime.timedelta(days=2)

    citizen, _ = _create_user(db_session, UserRole.CITIZEN, "cit_repo")
    collector, _ = _create_user(db_session, UserRole.COLLECTOR, "col_repo")

    # Create Reports
    report_res = WasteReport(
        user_id=citizen.id,
        collector_id=collector.id,
        category=WasteCategory.HAZARDOUS,
        description="Hazardous chemical spill",
        location="Lab 42",
        status=ReportStatus.RESOLVED,
        priority=ReportPriority.HIGH,
        created_at=two_days_ago,
        updated_at=one_day_ago,
    )
    db_session.add(report_res)
    db_session.commit()
    db_session.refresh(report_res)

    # Create Pickup
    pickup = Pickup(
        report_id=report_res.id,
        user_id=citizen.id,
        collector_id=collector.id,
        status=PickupStatus.COMPLETED,
        scheduled_date=one_day_ago,
        created_at=two_days_ago,
        completed_at=one_day_ago,
    )
    db_session.add(pickup)
    db_session.commit()

    repo = AnalyticsRepository(db_session)

    # Verify category metrics for HAZARDOUS contains the report
    cat_metrics = repo.get_category_metrics()
    haz_item = next(c for c in cat_metrics["categories"] if c["category"] == WasteCategory.HAZARDOUS)
    assert haz_item["report_count"] >= 1
    assert haz_item["resolved_count"] >= 1

    # Verify collector performance for this specific collector
    col_perf = repo.get_collector_performance()
    target_col = next((c for c in col_perf if c["collector_id"] == collector.id), None)
    assert target_col is not None
    assert target_col["assigned_reports"] == 1
    assert target_col["resolved_reports"] == 1
    assert target_col["assigned_pickups"] == 1
    assert target_col["completed_pickups"] == 1
    assert target_col["resolution_rate"] == 100.0
    assert target_col["avg_completion_time_hours"] > 0.0


def test_time_boundary_helper():
    """Verify time boundary conversions for query filters."""
    now = datetime.datetime.now(datetime.timezone.utc)
    t7 = AnalyticsRepository.get_time_boundary(TimeRangeEnum.LAST_7_DAYS)
    t30 = AnalyticsRepository.get_time_boundary(TimeRangeEnum.LAST_30_DAYS)
    t90 = AnalyticsRepository.get_time_boundary(TimeRangeEnum.LAST_90_DAYS)
    tall = AnalyticsRepository.get_time_boundary(TimeRangeEnum.ALL_TIME)

    assert tall is None
    assert t7 is not None and (now - t7).days in (6, 7, 8)
    assert t30 is not None and (now - t30).days in (29, 30, 31)
    assert t90 is not None and (now - t90).days in (89, 90, 91)


# ==============================================================================
# API ENDPOINT TESTS (M07.2)
# ==============================================================================

def test_admin_can_get_analytics_overview(client: TestClient, db_session: Session):
    """Admin successfully fetches platform overview KPIs."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_ov")
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "total_reports" in data
    assert "resolved_reports" in data
    assert "resolution_rate" in data
    assert "total_pickups" in data
    assert "completed_pickups" in data
    assert "pickup_completion_rate" in data
    assert "avg_resolution_turnaround_hours" in data
    assert "active_collectors" in data
    assert "active_citizens" in data
    assert data["time_range"] == "30d"
    assert "end_date" in data


def test_analytics_overview_time_range_filters(client: TestClient, db_session: Session):
    """Admin fetches overview across different supported time range parameters."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_range")
    headers = {"Authorization": f"Bearer {admin_token}"}

    for range_val in ["7d", "30d", "90d", "all"]:
        response = client.get(f"/api/v1/analytics/overview?time_range={range_val}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["time_range"] == range_val
        if range_val == "all":
            assert data["start_date"] is None
        else:
            assert data["start_date"] is not None


def test_analytics_overview_invalid_time_range_rejected(client: TestClient, db_session: Session):
    """Invalid time range filter returns 422 Unprocessable Entity."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_invalid")
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get("/api/v1/analytics/overview?time_range=invalid_99d", headers=headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_analytics_overview_unauthenticated_rejected(client: TestClient):
    """Unauthenticated request to analytics overview returns 401 Unauthorized."""
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_analytics_overview_citizen_forbidden(client: TestClient, db_session: Session):
    """Citizen role is forbidden (403) from accessing admin analytics overview."""
    _, citizen_token = _create_user(db_session, UserRole.CITIZEN, "cit_forbid")
    headers = {"Authorization": f"Bearer {citizen_token}"}

    response = client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_analytics_overview_collector_forbidden(client: TestClient, db_session: Session):
    """Collector role is forbidden (403) from accessing admin analytics overview."""
    _, collector_token = _create_user(db_session, UserRole.COLLECTOR, "col_forbid")
    headers = {"Authorization": f"Bearer {collector_token}"}

    response = client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN
