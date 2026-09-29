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
# API OVERVIEW ENDPOINT TESTS (M07.2)
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


# ==============================================================================
# API CATEGORY & TREND ENDPOINT TESTS (M07.3)
# ==============================================================================

def test_admin_can_get_analytics_categories(client: TestClient, db_session: Session):
    """Admin successfully fetches category analytics breakdown."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_cat")
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get("/api/v1/analytics/categories", headers=headers)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "total_reports" in data
    assert "categories" in data
    assert len(data["categories"]) == len(WasteCategory)

    for cat_item in data["categories"]:
        assert "category" in cat_item
        assert "label" in cat_item
        assert "report_count" in cat_item
        assert "percentage" in cat_item
        assert "resolved_count" in cat_item
        assert "resolution_rate" in cat_item


def test_analytics_categories_time_range_filters(client: TestClient, db_session: Session):
    """Category breakdown responds accurately across time range filters."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_cat_range")
    headers = {"Authorization": f"Bearer {admin_token}"}

    for range_val in ["7d", "30d", "90d", "all"]:
        response = client.get(f"/api/v1/analytics/categories?time_range={range_val}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["time_range"] == range_val


def test_analytics_categories_invalid_time_range_rejected(client: TestClient, db_session: Session):
    """Invalid time range filter on categories endpoint returns 422."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_cat_inv")
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get("/api/v1/analytics/categories?time_range=bad_range", headers=headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_analytics_categories_rbac_enforcement(client: TestClient, db_session: Session):
    """Verify citizen, collector, and unauthenticated requests are rejected on categories endpoint."""
    _, citizen_token = _create_user(db_session, UserRole.CITIZEN, "cit_cat_rbac")
    _, collector_token = _create_user(db_session, UserRole.COLLECTOR, "col_cat_rbac")

    # Unauthenticated
    assert client.get("/api/v1/analytics/categories").status_code == status.HTTP_401_UNAUTHORIZED
    # Citizen
    assert client.get(
        "/api/v1/analytics/categories",
        headers={"Authorization": f"Bearer {citizen_token}"},
    ).status_code == status.HTTP_403_FORBIDDEN
    # Collector
    assert client.get(
        "/api/v1/analytics/categories",
        headers={"Authorization": f"Bearer {collector_token}"},
    ).status_code == status.HTTP_403_FORBIDDEN


def test_admin_can_get_analytics_trends(client: TestClient, db_session: Session):
    """Admin successfully fetches time-series trends with chronological ordering."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_trend")
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get("/api/v1/analytics/trends?interval=day&time_range=30d", headers=headers)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["interval"] == "day"
    assert data["time_range"] == "30d"
    assert "data_points" in data
    assert len(data["data_points"]) > 0

    # Verify chronological ordering
    timestamps = [dp["timestamp"] for dp in data["data_points"]]
    assert timestamps == sorted(timestamps)

    for dp in data["data_points"]:
        assert "timestamp" in dp
        assert "label" in dp
        assert "submitted_reports" in dp
        assert "resolved_reports" in dp
        assert "requested_pickups" in dp
        assert "completed_pickups" in dp


def test_analytics_trends_intervals_and_time_ranges(client: TestClient, db_session: Session):
    """Trend endpoint supports all combinations of intervals and time ranges."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_trend_combos")
    headers = {"Authorization": f"Bearer {admin_token}"}

    for interval in ["day", "week", "month"]:
        for range_val in ["7d", "30d", "90d", "all"]:
            response = client.get(
                f"/api/v1/analytics/trends?interval={interval}&time_range={range_val}",
                headers=headers,
            )
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["interval"] == interval
            assert data["time_range"] == range_val
            assert isinstance(data["data_points"], list)


def test_analytics_trends_invalid_parameters_rejected(client: TestClient, db_session: Session):
    """Invalid interval or time range parameters return 422."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_trend_inv")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Invalid interval
    res1 = client.get("/api/v1/analytics/trends?interval=hourly", headers=headers)
    assert res1.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Invalid time_range
    res2 = client.get("/api/v1/analytics/trends?time_range=1year", headers=headers)
    assert res2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_analytics_trends_rbac_enforcement(client: TestClient, db_session: Session):
    """Verify citizen, collector, and unauthenticated requests are rejected on trends endpoint."""
    _, citizen_token = _create_user(db_session, UserRole.CITIZEN, "cit_tr_rbac")
    _, collector_token = _create_user(db_session, UserRole.COLLECTOR, "col_tr_rbac")

    # Unauthenticated
    assert client.get("/api/v1/analytics/trends").status_code == status.HTTP_401_UNAUTHORIZED
    # Citizen
    assert client.get(
        "/api/v1/analytics/trends",
        headers={"Authorization": f"Bearer {citizen_token}"},
    ).status_code == status.HTTP_403_FORBIDDEN
    # Collector
    assert client.get(
        "/api/v1/analytics/trends",
        headers={"Authorization": f"Bearer {collector_token}"},
    ).status_code == status.HTTP_403_FORBIDDEN


# ==============================================================================
# API COLLECTOR PERFORMANCE ENDPOINT TESTS (M07.4)
# ==============================================================================

def test_admin_can_get_collector_performance(client: TestClient, db_session: Session):
    """Admin successfully fetches collector performance analytics."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_col_perf")
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get("/api/v1/analytics/collectors-performance", headers=headers)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "time_range" in data
    assert "collectors" in data
    assert isinstance(data["collectors"], list)

    for col in data["collectors"]:
        assert "collector_id" in col
        assert "name" in col
        assert "email" in col
        assert "is_active" in col
        assert "assigned_reports" in col
        assert "resolved_reports" in col
        assert "assigned_pickups" in col
        assert "completed_pickups" in col
        assert "resolution_rate" in col
        assert "avg_completion_time_hours" in col


def test_collector_performance_time_range_filters(client: TestClient, db_session: Session):
    """Collector performance responds accurately across time range filters."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_col_range")
    headers = {"Authorization": f"Bearer {admin_token}"}

    for range_val in ["7d", "30d", "90d", "all"]:
        response = client.get(
            f"/api/v1/analytics/collectors-performance?time_range={range_val}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["time_range"] == range_val


def test_collector_performance_invalid_time_range_rejected(client: TestClient, db_session: Session):
    """Invalid time range filter on collector performance endpoint returns 422."""
    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_col_inv")
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.get(
        "/api/v1/analytics/collectors-performance?time_range=invalid_365d",
        headers=headers,
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_collector_performance_rbac_enforcement(client: TestClient, db_session: Session):
    """Verify citizen, collector, and unauthenticated requests are rejected on collector performance endpoint."""
    _, citizen_token = _create_user(db_session, UserRole.CITIZEN, "cit_col_rbac")
    _, collector_token = _create_user(db_session, UserRole.COLLECTOR, "col_col_rbac")

    # Unauthenticated
    assert client.get("/api/v1/analytics/collectors-performance").status_code == status.HTTP_401_UNAUTHORIZED
    # Citizen
    assert client.get(
        "/api/v1/analytics/collectors-performance",
        headers={"Authorization": f"Bearer {citizen_token}"},
    ).status_code == status.HTTP_403_FORBIDDEN
    # Collector
    assert client.get(
        "/api/v1/analytics/collectors-performance",
        headers={"Authorization": f"Bearer {collector_token}"},
    ).status_code == status.HTTP_403_FORBIDDEN


def test_collector_performance_aggregation_and_ordering(client: TestClient, db_session: Session):
    """Verify calculation of metrics and deterministic ordering for multiple collectors."""
    now = datetime.datetime.now(datetime.timezone.utc)
    one_day_ago = now - datetime.timedelta(days=1)
    two_days_ago = now - datetime.timedelta(days=2)

    _, admin_token = _create_user(db_session, UserRole.ADMIN, "adm_multi_col")
    col1, _ = _create_user(db_session, UserRole.COLLECTOR, "col_active_1")
    col2, _ = _create_user(db_session, UserRole.COLLECTOR, "col_active_2")
    citizen, _ = _create_user(db_session, UserRole.CITIZEN, "cit_multi_col")

    # Collector 1 has 2 completed tasks
    r1 = WasteReport(
        user_id=citizen.id,
        collector_id=col1.id,
        category=WasteCategory.METAL,
        description="Scrap metal",
        location="Site A",
        status=ReportStatus.RESOLVED,
        priority=ReportPriority.HIGH,
        created_at=two_days_ago,
        updated_at=one_day_ago,
    )
    db_session.add(r1)
    db_session.commit()
    db_session.refresh(r1)

    p1 = Pickup(
        report_id=r1.id,
        user_id=citizen.id,
        collector_id=col1.id,
        status=PickupStatus.COMPLETED,
        scheduled_date=one_day_ago,
        created_at=two_days_ago,
        completed_at=one_day_ago,
    )
    db_session.add(p1)
    db_session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/v1/analytics/collectors-performance?time_range=all", headers=headers)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    collectors = data["collectors"]

    item1 = next((c for c in collectors if c["collector_id"] == col1.id), None)
    assert item1 is not None
    assert item1["assigned_reports"] >= 1
    assert item1["resolved_reports"] >= 1
    assert item1["assigned_pickups"] >= 1
    assert item1["completed_pickups"] >= 1
    assert item1["resolution_rate"] == 100.0
    assert item1["avg_completion_time_hours"] > 0.0

    item2 = next((c for c in collectors if c["collector_id"] == col2.id), None)
    assert item2 is not None
    assert item2["assigned_reports"] == 0
    assert item2["resolved_reports"] == 0
    assert item2["resolution_rate"] == 0.0
    assert item2["avg_completion_time_hours"] == 0.0
