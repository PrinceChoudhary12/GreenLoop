"""Repository for aggregating platform-wide analytics and reporting metrics."""

import datetime
from collections import defaultdict
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.models.enums import PickupStatus, ReportStatus, UserRole, WasteCategory
from backend.app.models.pickup import Pickup
from backend.app.models.report import WasteReport
from backend.app.models.user import User
from backend.app.schemas.analytics import TimeRangeEnum, TrendIntervalEnum

CATEGORY_LABELS: Dict[WasteCategory, str] = {
    WasteCategory.GENERAL: "General Waste",
    WasteCategory.PLASTIC: "Plastic",
    WasteCategory.PAPER: "Paper",
    WasteCategory.GLASS: "Glass",
    WasteCategory.METAL: "Metal",
    WasteCategory.E_WASTE: "E-Waste",
    WasteCategory.ORGANIC: "Organic",
    WasteCategory.HAZARDOUS: "Hazardous",
    WasteCategory.OTHER: "Other",
}


def _ensure_utc(dt: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    """Helper to ensure a datetime is offset-aware UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=datetime.timezone.utc)
    return dt.astimezone(datetime.timezone.utc)


class AnalyticsRepository:
    """Data-access repository for platform analytics and operational reporting."""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def get_time_boundary(time_range: TimeRangeEnum) -> Optional[datetime.datetime]:
        """Convert a time range enum into an absolute UTC start boundary datetime."""
        now = datetime.datetime.now(datetime.timezone.utc)
        if time_range == TimeRangeEnum.LAST_7_DAYS:
            return now - datetime.timedelta(days=7)
        if time_range == TimeRangeEnum.LAST_30_DAYS:
            return now - datetime.timedelta(days=30)
        if time_range == TimeRangeEnum.LAST_90_DAYS:
            return now - datetime.timedelta(days=90)
        return None

    def get_overview_metrics(
        self,
        start_date: Optional[datetime.datetime] = None,
    ) -> Dict[str, Any]:
        """Calculate high-level KPI metrics across reports, pickups, and user activity."""
        # 1. Reports count and resolution count
        reports_query = select(WasteReport)
        if start_date:
            reports_query = reports_query.where(WasteReport.created_at >= start_date)
        reports = list(self.db.scalars(reports_query).all())

        total_reports = len(reports)
        resolved_reports = sum(1 for r in reports if r.status == ReportStatus.RESOLVED)
        resolution_rate = (
            round((resolved_reports / total_reports) * 100.0, 2)
            if total_reports > 0
            else 0.0
        )

        # Calculate average turnaround time in hours for resolved reports
        turnaround_hours: List[float] = []
        for r in reports:
            if r.status == ReportStatus.RESOLVED and r.created_at and r.updated_at:
                c_dt = _ensure_utc(r.created_at)
                u_dt = _ensure_utc(r.updated_at)
                if c_dt and u_dt:
                    delta = u_dt - c_dt
                    hours = delta.total_seconds() / 3600.0
                    if hours >= 0:
                        turnaround_hours.append(hours)

        avg_turnaround = (
            round(sum(turnaround_hours) / len(turnaround_hours), 2)
            if turnaround_hours
            else 0.0
        )

        # 2. Pickups count and completion count
        pickups_query = select(Pickup)
        if start_date:
            pickups_query = pickups_query.where(Pickup.created_at >= start_date)
        pickups = list(self.db.scalars(pickups_query).all())

        total_pickups = len(pickups)
        completed_pickups = sum(1 for p in pickups if p.status == PickupStatus.COMPLETED)
        pickup_completion_rate = (
            round((completed_pickups / total_pickups) * 100.0, 2)
            if total_pickups > 0
            else 0.0
        )

        # 3. Active users counts (systemwide state)
        collectors_count_stmt = (
            select(func.count(User.id))
            .where(User.role == UserRole.COLLECTOR, User.is_active.is_(True))
        )
        active_collectors = self.db.scalar(collectors_count_stmt) or 0

        citizens_count_stmt = (
            select(func.count(User.id))
            .where(User.role == UserRole.CITIZEN, User.is_active.is_(True))
        )
        active_citizens = self.db.scalar(citizens_count_stmt) or 0

        return {
            "total_reports": total_reports,
            "resolved_reports": resolved_reports,
            "resolution_rate": resolution_rate,
            "total_pickups": total_pickups,
            "completed_pickups": completed_pickups,
            "pickup_completion_rate": pickup_completion_rate,
            "avg_resolution_turnaround_hours": avg_turnaround,
            "active_collectors": active_collectors,
            "active_citizens": active_citizens,
        }

    def get_category_metrics(
        self,
        start_date: Optional[datetime.datetime] = None,
    ) -> Dict[str, Any]:
        """Aggregate report metrics grouped by controlled WasteCategory."""
        query = select(WasteReport)
        if start_date:
            query = query.where(WasteReport.created_at >= start_date)
        reports = list(self.db.scalars(query).all())
        total_reports = len(reports)

        category_counts: Dict[WasteCategory, int] = defaultdict(int)
        category_resolved: Dict[WasteCategory, int] = defaultdict(int)

        for r in reports:
            category_counts[r.category] += 1
            if r.status == ReportStatus.RESOLVED:
                category_resolved[r.category] += 1

        items: List[Dict[str, Any]] = []
        for cat in WasteCategory:
            count = category_counts[cat]
            resolved = category_resolved[cat]
            pct = round((count / total_reports) * 100.0, 2) if total_reports > 0 else 0.0
            res_rate = round((resolved / count) * 100.0, 2) if count > 0 else 0.0

            items.append({
                "category": cat,
                "label": CATEGORY_LABELS.get(cat, cat.value.title()),
                "report_count": count,
                "percentage": pct,
                "resolved_count": resolved,
                "resolution_rate": res_rate,
            })

        # Sort items by report count descending
        items.sort(key=lambda x: x["report_count"], reverse=True)

        return {
            "total_reports": total_reports,
            "categories": items,
        }

    def get_trend_metrics(
        self,
        start_date: Optional[datetime.datetime] = None,
        interval: TrendIntervalEnum = TrendIntervalEnum.DAY,
        time_range: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
    ) -> List[Dict[str, Any]]:
        """Generate time-series buckets with submitted/resolved reports and requested/completed pickups."""
        now = datetime.datetime.now(datetime.timezone.utc)

        if start_date:
            effective_start = _ensure_utc(start_date)
        else:
            min_report_dt = _ensure_utc(self.db.scalar(select(func.min(WasteReport.created_at))))
            min_pickup_dt = _ensure_utc(self.db.scalar(select(func.min(Pickup.created_at))))
            candidates = [dt for dt in [min_report_dt, min_pickup_dt] if dt is not None]
            if candidates:
                effective_start = min(candidates)
            else:
                effective_start = now - datetime.timedelta(days=30)

        assert effective_start is not None

        # Align effective_start to boundary
        if interval == TrendIntervalEnum.DAY:
            effective_start = effective_start.replace(hour=0, minute=0, second=0, microsecond=0)
        elif interval == TrendIntervalEnum.WEEK:
            effective_start = (effective_start - datetime.timedelta(days=effective_start.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        else:  # MONTH
            effective_start = effective_start.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Query all relevant reports in range
        rep_query = select(WasteReport)
        if start_date:
            rep_query = rep_query.where(WasteReport.created_at >= effective_start)
        reports = list(self.db.scalars(rep_query).all())

        # Query all relevant pickups in range
        pick_query = select(Pickup)
        if start_date:
            pick_query = pick_query.where(Pickup.created_at >= effective_start)
        pickups = list(self.db.scalars(pick_query).all())

        # Determine bucketing interval
        def bucket_key(dt: datetime.datetime) -> tuple:
            if interval == TrendIntervalEnum.DAY:
                return (dt.year, dt.month, dt.day)
            elif interval == TrendIntervalEnum.WEEK:
                iso_year, iso_week, _ = dt.isocalendar()
                return (iso_year, iso_week)
            else:  # MONTH
                return (dt.year, dt.month)

        def bucket_label(dt: datetime.datetime) -> str:
            if interval == TrendIntervalEnum.DAY:
                return dt.strftime("%b %d")
            elif interval == TrendIntervalEnum.WEEK:
                iso_year, iso_week, _ = dt.isocalendar()
                return f"Wk {iso_week}"
            else:
                return dt.strftime("%b %Y")

        # Generate timeline grid
        buckets: Dict[tuple, Dict[str, Any]] = {}
        curr = effective_start
        step = datetime.timedelta(
            days=1 if interval == TrendIntervalEnum.DAY else 7 if interval == TrendIntervalEnum.WEEK else 30
        )

        while curr <= now + datetime.timedelta(hours=1):
            key = bucket_key(curr)
            if key not in buckets:
                buckets[key] = {
                    "timestamp": curr,
                    "label": bucket_label(curr),
                    "submitted_reports": 0,
                    "resolved_reports": 0,
                    "requested_pickups": 0,
                    "completed_pickups": 0,
                }
            curr += step

        # Accumulate reports
        for r in reports:
            if r.created_at:
                c_dt = _ensure_utc(r.created_at)
                if c_dt:
                    key = bucket_key(c_dt)
                    if key in buckets:
                        buckets[key]["submitted_reports"] += 1
            if r.status == ReportStatus.RESOLVED and r.updated_at:
                u_dt = _ensure_utc(r.updated_at)
                if u_dt:
                    key = bucket_key(u_dt)
                    if key in buckets:
                        buckets[key]["resolved_reports"] += 1

        # Accumulate pickups
        for p in pickups:
            if p.created_at:
                c_dt = _ensure_utc(p.created_at)
                if c_dt:
                    key = bucket_key(c_dt)
                    if key in buckets:
                        buckets[key]["requested_pickups"] += 1
            if p.status == PickupStatus.COMPLETED and (p.completed_at or p.updated_at):
                comp_dt = _ensure_utc(p.completed_at or p.updated_at)
                if comp_dt:
                    key = bucket_key(comp_dt)
                    if key in buckets:
                        buckets[key]["completed_pickups"] += 1

        # Format sorted list
        sorted_buckets = sorted(buckets.values(), key=lambda b: b["timestamp"])
        return sorted_buckets

    def get_collector_performance(
        self,
        start_date: Optional[datetime.datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Calculate operational performance metrics for each registered collector."""
        collectors_stmt = select(User).where(User.role == UserRole.COLLECTOR).order_by(User.name)
        collectors = list(self.db.scalars(collectors_stmt).all())

        result: List[Dict[str, Any]] = []
        for col in collectors:
            # Reports assigned to this collector
            rep_stmt = select(WasteReport).where(WasteReport.collector_id == col.id)
            if start_date:
                rep_stmt = rep_stmt.where(WasteReport.created_at >= start_date)
            col_reports = list(self.db.scalars(rep_stmt).all())

            assigned_reports = len(col_reports)
            resolved_reports = sum(1 for r in col_reports if r.status == ReportStatus.RESOLVED)

            # Pickups assigned to this collector
            pick_stmt = select(Pickup).where(Pickup.collector_id == col.id)
            if start_date:
                pick_stmt = pick_stmt.where(Pickup.created_at >= start_date)
            col_pickups = list(self.db.scalars(pick_stmt).all())

            assigned_pickups = len(col_pickups)
            completed_pickups = sum(1 for p in col_pickups if p.status == PickupStatus.COMPLETED)

            # Calculate resolution rate across assigned tasks
            total_tasks = assigned_reports + assigned_pickups
            total_completed = resolved_reports + completed_pickups
            res_rate = (
                round((total_completed / total_tasks) * 100.0, 2)
                if total_tasks > 0
                else 0.0
            )

            # Calculate average completion time for completed pickups
            completion_durations: List[float] = []
            for p in col_pickups:
                if p.status == PickupStatus.COMPLETED and p.completed_at and p.created_at:
                    dur = (p.completed_at - p.created_at).total_seconds() / 3600.0
                    if dur >= 0:
                        completion_durations.append(dur)

            avg_completion = (
                round(sum(completion_durations) / len(completion_durations), 2)
                if completion_durations
                else 0.0
            )

            result.append({
                "collector_id": col.id,
                "name": col.name,
                "email": col.email,
                "is_active": col.is_active,
                "assigned_reports": assigned_reports,
                "resolved_reports": resolved_reports,
                "assigned_pickups": assigned_pickups,
                "completed_pickups": completed_pickups,
                "resolution_rate": res_rate,
                "avg_completion_time_hours": avg_completion,
            })

        # Sort by total completed tasks descending
        result.sort(key=lambda c: (c["completed_pickups"] + c["resolved_reports"]), reverse=True)
        return result
