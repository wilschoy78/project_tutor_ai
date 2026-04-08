from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import html
from app.services.student_service import student_service
from app.services.rag_service import rag_service
from app.core.config import settings

router = APIRouter()


@router.get("/analytics/{course_id}", response_model=Dict[str, Any])
def get_course_analytics(course_id: int):
    try:
        analytics = student_service.get_course_analytics(course_id)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analytics/{course_id}/sync", response_model=Dict[str, Any])
def sync_course_analytics(course_id: int):
    try:
        analytics = student_service.sync_course_analytics(course_id)
        rag_service.ingest_analytics_summary(course_id, analytics)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/{course_id}/print", response_class=HTMLResponse)
def print_course_analytics(course_id: int, request: Request):
    try:
        analytics = student_service.get_course_analytics(course_id)

        root_path = request.scope.get("root_path") or ""
        api_prefix = f"{root_path}{settings.API_V1_STR}"
        json_url = f"{api_prefix}/dashboard/analytics/{course_id}"
        sync_url = f"{api_prefix}/dashboard/analytics/{course_id}/sync"
        home_url = f"{root_path}/"

        total_students = int(analytics.get("total_students") or 0)
        active_students = int(analytics.get("active_students") or 0)
        average_score = float(analytics.get("average_score") or 0.0)
        top_weaknesses = analytics.get("top_weaknesses") or []
        students = analytics.get("students") or []

        if not isinstance(students, list):
            students = []
        if not isinstance(top_weaknesses, list):
            top_weaknesses = []

        def risk_label(s: Dict[str, Any]) -> str:
            rl = str(s.get("risk_level") or "").strip().lower()
            if rl in {"at_risk", "needs_support", "on_track", "no_data"}:
                return rl.replace("_", " ").title()
            try:
                score = float(s.get("avg_score") or 0.0)
            except Exception:
                score = 0.0
            if score >= 80:
                return "On Track"
            if score >= 50:
                return "Needs Support"
            return "At Risk"

        rows = []
        for s in students:
            if not isinstance(s, dict):
                continue
            sid = html.escape(str(s.get("id", "")))
            name = html.escape(str(s.get("name", "")))
            style = html.escape(str(s.get("learning_style", "General")))
            avg = html.escape(str(s.get("avg_score", 0)))
            status = html.escape(risk_label(s))
            rows.append(
                f"<tr>"
                f"<td class='td'>{name}</td>"
                f"<td class='td muted'>{sid}</td>"
                f"<td class='td'>{style}</td>"
                f"<td class='td right'>{avg}%</td>"
                f"<td class='td'>{status}</td>"
                f"</tr>"
            )

        weakness_html = ""
        if top_weaknesses:
            items = []
            for w in top_weaknesses[:8]:
                if not isinstance(w, dict):
                    continue
                topic = html.escape(str(w.get("topic", "")))
                count = html.escape(str(w.get("count", "")))
                if topic:
                    items.append(f"<li><span class='pill'>{topic}</span> <span class='muted'>({count} students)</span></li>")
            if items:
                weakness_html = "<ul class='list'>" + "".join(items) + "</ul>"

        html_content = f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Class Analytics Report</title>
    <style>
      body {{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin:0; background:#f6f7fb; }}
      .wrap {{ max-width: 1050px; margin: 28px auto; padding: 0 16px; }}
      .card {{ background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow: 0 6px 22px rgba(0,0,0,.06); overflow:hidden; }}
      .header {{ padding:16px 18px; border-bottom:1px solid #eef0f3; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }}
      .title {{ font-weight:900; font-size:18px; color:#111827; }}
      .subtitle {{ margin-top:4px; font-size:12px; color:#6b7280; }}
      .actions {{ display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }}
      .link {{ font-size:12px; color:#1d4ed8; text-decoration:underline; text-underline-offset:2px; font-weight:800; }}
      .btn {{ font-size:12px; font-weight:900; border-radius:10px; border:1px solid #e5e7eb; padding:8px 10px; background:#111827; color:#fff; cursor:pointer; }}
      .grid {{ display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 16px 18px; border-bottom:1px solid #eef0f3; }}
      .stat {{ border:1px solid #eef0f3; border-radius:14px; padding:12px; }}
      .stat .k {{ font-size:12px; color:#6b7280; font-weight:800; }}
      .stat .v {{ margin-top:6px; font-size:22px; font-weight:900; color:#111827; }}
      .section {{ padding: 16px 18px; }}
      h3 {{ margin:0 0 10px 0; font-size:14px; color:#111827; font-weight:900; }}
      table {{ width:100%; border-collapse:collapse; }}
      th {{ text-align:left; font-size:12px; color:#6b7280; padding:10px 14px; background:#fafafa; border-bottom:1px solid #eef0f3; }}
      td {{ padding:10px 14px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#111827; vertical-align:top; }}
      .muted {{ color:#6b7280; }}
      .right {{ text-align:right; }}
      .pill {{ display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; background:#eef2ff; color:#3730a3; font-size:11px; font-weight:900; }}
      .list {{ margin:0; padding-left:16px; }}
      .note {{ font-size:12px; color:#6b7280; padding: 0 18px 16px 18px; }}
      @media print {{
        body {{ background:#fff; }}
        .wrap {{ margin:0; padding:0; max-width:none; }}
        .card {{ box-shadow:none; border:none; border-radius:0; }}
        .actions {{ display:none; }}
      }}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="header">
          <div>
            <div class="title">Class Analytics Report</div>
            <div class="subtitle">Course ID: {html.escape(str(course_id))}</div>
          </div>
          <div class="actions">
            <button class="btn" onclick="window.print()">Print / Save PDF</button>
            <a class="link" href="{json_url}">View JSON</a>
            <a class="link" href="{sync_url}">Sync Now</a>
            <a class="link" href="{home_url}">Back to App</a>
          </div>
        </div>

        <div class="grid">
          <div class="stat"><div class="k">Total Students</div><div class="v">{total_students}</div></div>
          <div class="stat"><div class="k">Active Students</div><div class="v">{active_students}</div></div>
          <div class="stat"><div class="k">Class Average</div><div class="v">{average_score:.1f}%</div></div>
        </div>

        <div class="section">
          <h3>Top Struggle Areas</h3>
          {weakness_html if weakness_html else "<div class='muted'>No topics flagged yet.</div>"}
        </div>

        <div class="section">
          <h3>Student Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Learning Style</th>
                <th class="right">Avg Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {''.join(rows) if rows else "<tr><td class='td muted' colspan='5'>No student records available.</td></tr>"}
            </tbody>
          </table>
        </div>

        <div class="note">
          This report is generated from cached analytics. For freshest results, have students run Sync My Progress, then run Sync Class Analytics.
        </div>
      </div>
    </div>
  </body>
</html>
"""
        return HTMLResponse(html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StudentProfileUpdate(BaseModel):
    learning_style: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    interests: Optional[List[str]] = None


class LearningPathOverrides(BaseModel):
    course_id: int
    pinned_recommendations: List[str]


@router.get("/students/{student_id}/profile", response_model=Dict[str, Any])
def get_student_profile(student_id: int):
    try:
        profile = student_service.get_student_profile(student_id)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}/report", response_class=HTMLResponse)
def print_student_report(student_id: int, course_id: int, request: Request):
    try:
        profile = student_service.get_student_profile(student_id)
        progress = student_service.get_student_progress(student_id, course_id, allow_sync=False)
        learning_path = rag_service.generate_learning_path(course_id, student_id)

        root_path = request.scope.get("root_path") or ""
        api_prefix = f"{root_path}{settings.API_V1_STR}"
        json_url = f"{api_prefix}/dashboard/students/{student_id}/profile"
        progress_sync_url = f"{api_prefix}/ai/progress/sync"
        home_url = f"{root_path}/"

        name = html.escape(str(profile.get("name", f"Student {student_id}")))
        learning_style = html.escape(str(profile.get("learning_style", "General")))
        strengths = profile.get("strengths") or []
        weaknesses = profile.get("weaknesses") or []
        interests = profile.get("interests") or []

        if not isinstance(strengths, list):
            strengths = []
        if not isinstance(weaknesses, list):
            weaknesses = []
        if not isinstance(interests, list):
            interests = []

        quiz_scores = progress.get("quiz_scores") or {}
        last_synced = progress.get("last_synced")
        has_synced = last_synced is not None

        quiz_rows = []
        if isinstance(quiz_scores, dict):
            for k, v in list(quiz_scores.items())[:40]:
                qn = html.escape(str(k))
                sc = html.escape(str(v))
                quiz_rows.append(f"<tr><td class='td'>{qn}</td><td class='td right'>{sc}%</td></tr>")

        plan_text = html.escape(str(learning_path.get("study_plan") or ""))
        recs = learning_path.get("recommendations") or []
        if not isinstance(recs, list):
            recs = []
        rec_html = "".join([f"<li>{html.escape(str(r))}</li>" for r in recs[:12]])

        def pill_list(items: List[Any]) -> str:
            safe = [html.escape(str(i)) for i in items if str(i).strip()]
            if not safe:
                return "<span class='muted'>None</span>"
            return " ".join([f"<span class='pill'>{s}</span>" for s in safe[:18]])

        note = ""
        if not has_synced:
            note = (
                "<div class='warn'>"
                "<span class='warnb'>No synced progress found.</span> "
                "Ask the student to click Sync My Progress first, then re-open this report."
                "</div>"
            )

        html_content = f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Student Report</title>
    <style>
      body {{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin:0; background:#f6f7fb; }}
      .wrap {{ max-width: 980px; margin: 28px auto; padding: 0 16px; }}
      .card {{ background:#fff; border:1px solid #e5e7eb; border-radius:16px; box-shadow: 0 6px 22px rgba(0,0,0,.06); overflow:hidden; }}
      .header {{ padding:16px 18px; border-bottom:1px solid #eef0f3; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }}
      .title {{ font-weight:900; font-size:18px; color:#111827; }}
      .subtitle {{ margin-top:4px; font-size:12px; color:#6b7280; }}
      .actions {{ display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }}
      .link {{ font-size:12px; color:#1d4ed8; text-decoration:underline; text-underline-offset:2px; font-weight:800; }}
      .btn {{ font-size:12px; font-weight:900; border-radius:10px; border:1px solid #e5e7eb; padding:8px 10px; background:#111827; color:#fff; cursor:pointer; }}
      .section {{ padding: 16px 18px; border-bottom:1px solid #eef0f3; }}
      h3 {{ margin:0 0 10px 0; font-size:14px; color:#111827; font-weight:900; }}
      .muted {{ color:#6b7280; }}
      .pill {{ display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; background:#f3f4f6; color:#111827; font-size:11px; font-weight:900; margin-right:6px; margin-bottom:6px; }}
      .warn {{ font-size:12px; color:#92400e; background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:10px 12px; }}
      .warnb {{ font-weight:900; }}
      table {{ width:100%; border-collapse:collapse; }}
      th {{ text-align:left; font-size:12px; color:#6b7280; padding:10px 14px; background:#fafafa; border-bottom:1px solid #eef0f3; }}
      td {{ padding:10px 14px; border-bottom:1px solid #f1f5f9; font-size:13px; color:#111827; vertical-align:top; }}
      .right {{ text-align:right; }}
      pre {{ white-space:pre-wrap; background:#fafafa; border:1px solid #eef0f3; border-radius:12px; padding:10px 12px; font-size:12px; color:#111827; }}
      @media print {{
        body {{ background:#fff; }}
        .wrap {{ margin:0; padding:0; max-width:none; }}
        .card {{ box-shadow:none; border:none; border-radius:0; }}
        .actions {{ display:none; }}
      }}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="header">
          <div>
            <div class="title">Student Report</div>
            <div class="subtitle">{name} • Student ID: {html.escape(str(student_id))} • Course ID: {html.escape(str(course_id))}</div>
          </div>
          <div class="actions">
            <button class="btn" onclick="window.print()">Print / Save PDF</button>
            <a class="link" href="{json_url}">View Profile JSON</a>
            <a class="link" href="{home_url}">Back to App</a>
          </div>
        </div>

        <div class="section">
          {note}
          <div class="muted" style="margin-top:8px;">Learning style: <strong>{learning_style}</strong></div>
          <div style="margin-top:10px;"><strong>Strengths:</strong> {pill_list(strengths)}</div>
          <div style="margin-top:10px;"><strong>Weaknesses:</strong> {pill_list(weaknesses)}</div>
          <div style="margin-top:10px;"><strong>Interests:</strong> {pill_list(interests)}</div>
        </div>

        <div class="section">
          <h3>Quiz Scores</h3>
          <div class="muted" style="margin-bottom:10px;">Last synced: {html.escape(str(last_synced)) if last_synced is not None else "Not yet synced"}</div>
          <table>
            <thead><tr><th>Quiz</th><th class="right">Score</th></tr></thead>
            <tbody>
              {''.join(quiz_rows) if quiz_rows else "<tr><td class='td muted' colspan='2'>No quiz scores available.</td></tr>"}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>Personalized Learning Plan</h3>
          {("<pre>" + plan_text + "</pre>") if plan_text else "<div class='muted'>No plan generated yet.</div>"}
          {("<div style='margin-top:10px;'><strong>Recommendations:</strong><ul>" + rec_html + "</ul></div>") if rec_html else ""}
        </div>

        <div class="section">
          <h3>How to Refresh This Report</h3>
          <div class="muted">
            Student can run Sync My Progress (API: POST {html.escape(progress_sync_url)} with course_id and student_id). Then re-open this report to reflect updated Moodle quiz scores.
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
"""
        return HTMLResponse(html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/students/{student_id}/profile", response_model=Dict[str, Any])
def update_student_profile(student_id: int, payload: StudentProfileUpdate):
    try:
        data: Dict[str, Any] = {}
        if payload.learning_style is not None:
            data["learning_style"] = payload.learning_style
        if payload.strengths is not None:
            data["strengths"] = payload.strengths
        if payload.weaknesses is not None:
            data["weaknesses"] = payload.weaknesses
        if payload.interests is not None:
            data["interests"] = payload.interests
        profile = student_service.update_student_profile(student_id, data)
        full_profile = student_service.get_student_profile(student_id)
        return full_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}/learning-path-overrides", response_model=Dict[str, Any])
def get_learning_path_overrides(student_id: int, course_id: int):
    try:
        overrides = student_service.get_learning_path_overrides(student_id, course_id)
        return overrides
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/students/{student_id}/learning-path-overrides", response_model=Dict[str, Any])
def set_learning_path_overrides(student_id: int, payload: LearningPathOverrides):
    try:
        result = student_service.set_learning_path_overrides(
            student_id,
            payload.course_id,
            payload.pinned_recommendations,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
