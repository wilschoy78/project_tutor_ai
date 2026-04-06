from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from typing import List, Dict, Any
from urllib.parse import urlparse, urlunparse
from app.core.config import settings
from app.services.moodle_client import moodle_client

router = APIRouter()

@router.get("/courses", response_model=List[Dict[str, Any]])
def get_courses():
    """
    Fetch all available courses from the Moodle instance.
    This serves as the synchronization check for existing Moodle data.
    """
    try:
        # Call Moodle API core_course_get_courses
        # We don't need params to get all courses usually, or we can filter if needed
        courses = moodle_client._call_moodle("core_course_get_courses")
        
        # Clean up response if needed (Moodle returns a list of dicts)
        if isinstance(courses, list):
            return courses
        elif isinstance(courses, dict) and "courses" in courses:
             # Some API wrappers might return {"courses": [...]}
             return courses["courses"]
        else:
            # Fallback/Empty
            return []
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch courses from Moodle: {str(e)}")


@router.get("/activity-link")
def activity_link(course_id: int, cmid: int):
    try:
        contents = moodle_client.get_course_contents(course_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch course contents from Moodle: {str(e)}")

    found = None
    if isinstance(contents, list):
        for section in contents:
            modules = section.get("modules") if isinstance(section, dict) else None
            if not isinstance(modules, list):
                continue
            for mod in modules:
                if not isinstance(mod, dict):
                    continue
                try:
                    mid = int(mod.get("id"))
                except Exception:
                    continue
                if mid == cmid:
                    found = mod
                    break
            if found:
                break

    if not found:
        raise HTTPException(status_code=404, detail="Activity not found or not accessible for this course.")

    modname = str(found.get("modname") or "").strip().lower()
    url = found.get("url")
    if not url and modname:
        url = f"{settings.MOODLE_URL}/mod/{modname}/view.php?id={cmid}"
    if not isinstance(url, str) or not url:
        raise HTTPException(status_code=404, detail="Activity URL unavailable.")

    internal_base = settings.MOODLE_URL
    public_base = settings.MOODLE_PUBLIC_URL or settings.MOODLE_URL

    def base_hostname(base: str):
        try:
            p = urlparse(base)
            return p.hostname
        except Exception:
            return None

    internal_host = base_hostname(internal_base)
    public_host = base_hostname(public_base)
    try:
        target = urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="Unsafe redirect blocked.")

    if not target.scheme or not target.netloc:
        raise HTTPException(status_code=400, detail="Unsafe redirect blocked.")

    allowed_hosts = {h for h in [internal_host, public_host, "moodle"] if h}
    if target.hostname not in allowed_hosts:
        raise HTTPException(status_code=400, detail="Unsafe redirect blocked.")

    try:
        pub = urlparse(public_base)
        if not pub.scheme or not pub.netloc:
            raise HTTPException(status_code=500, detail="Invalid MOODLE_PUBLIC_URL configuration.")
        redirect_url = urlunparse((pub.scheme, pub.netloc, target.path, target.params, target.query, target.fragment))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Unsafe redirect blocked.")

    return RedirectResponse(url=redirect_url, status_code=307)
