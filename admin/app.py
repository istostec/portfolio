from __future__ import annotations

import os
import uuid
from functools import wraps
from pathlib import Path
from typing import Any

from flask import Flask, flash, jsonify, redirect, render_template, request, send_from_directory, session, url_for
from flask_wtf.csrf import CSRFProtect
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

from db import DatabaseError, cursor, init_database
from migration import migrate_json_to_db
from services import repository


BASE_DIR = Path(__file__).resolve().parent
SITE_DIR = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

app = Flask(__name__)
app.secret_key = os.environ.get("ISTOS_ADMIN_SECRET", "istos-admin-local-secret")
app.config["UPLOAD_FOLDER"] = UPLOAD_DIR
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

# Session Cookie Security Configurations
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE", "True").lower() in ("true", "1", "yes")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Enable CSRF Protection
csrf = CSRFProtect(app)


def bootstrap() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    init_database()
    migrate_json_to_db()


with app.app_context():
    bootstrap()


@app.after_request
def add_security_headers(response):
    # CORS headers for API paths
    if request.path.startswith("/api/"):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        
    # Secure Headers
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Content Security Policy (CSP)
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: http://localhost:5000 http://127.0.0.1:5000; "
        "connect-src 'self' http://localhost:5000 http://127.0.0.1:5000;"
    )
    response.headers["Content-Security-Policy"] = csp
    return response


@app.errorhandler(DatabaseError)
def database_error(exc: DatabaseError):
    if request.path.startswith("/api/"):
        return error_response(str(exc), 500)
    flash(str(exc), "error")
    return redirect(url_for("dashboard") if session.get("admin_logged_in") else url_for("login"))


def success_response(data: dict[str, Any] | None = None, status: int = 200):
    payload = {"ok": True}
    if data:
        payload.update(data)
    return jsonify(payload), status


def error_response(message: str, status: int = 400, errors: dict[str, str] | None = None):
    payload: dict[str, Any] = {"ok": False, "message": message}
    if errors:
        payload["errors"] = errors
    return jsonify(payload), status


def request_payload() -> dict[str, Any]:
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form.to_dict()


def require_fields(data: dict[str, Any], fields: list[str]) -> dict[str, str]:
    return {field: "This field is required." for field in fields if not str(data.get(field) or "").strip()}


def parse_id(item_id: str) -> int | None:
    try:
        return int(item_id)
    except (TypeError, ValueError):
        return None


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload(file_storage) -> str:
    if not file_storage or not file_storage.filename:
        return ""
    if not allowed_file(file_storage.filename):
        flash("Image must be PNG, JPG, JPEG, WEBP, or GIF.", "error")
        return ""
    filename = secure_filename(file_storage.filename)
    unique_name = f"{uuid.uuid4().hex[:10]}-{filename}"
    try:
        file_storage.save(UPLOAD_DIR / unique_name)
    except OSError:
        flash("Image could not be saved right now. The project was saved without an image.", "error")
        return ""
    return unique_name


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


def require_api_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if request.method in ["POST", "PUT", "DELETE"]:
            # Exclude public contact submission from api auth checks
            if request.path == "/api/contacts" and request.method == "POST":
                return view(*args, **kwargs)
            if not session.get("admin_logged_in"):
                return error_response("Admin login required for modification operations.", 401)
        return view(*args, **kwargs)

    return wrapped


def public_project(project: dict[str, Any]) -> dict[str, Any]:
    image = project.get("image") or ""
    return {
        "id": project.get("id", ""),
        "title": project.get("title", ""),
        "category": project.get("category", ""),
        "description": project.get("description", ""),
        "tech": project.get("tech", ""),
        "status": project.get("status", "Published"),
        "created_at": project.get("created_at", ""),
        "image_url": url_for("static", filename=f"uploads/{image}", _external=True) if image else "",
    }


def validate_project(data: dict[str, Any], partial: bool = False) -> dict[str, str]:
    required = [] if partial else ["title", "category", "description"]
    errors = require_fields(data, required)
    status = data.get("status")
    if status and status not in {"Published", "Draft", "Featured"}:
        errors["status"] = "Status must be Published, Draft, or Featured."
    return errors


def validate_review(data: dict[str, Any], partial: bool = False) -> dict[str, str]:
    required = [] if partial else ["client_name", "review"]
    errors = require_fields(data, required)
    if data.get("rating"):
        try:
            rating = int(data["rating"])
            if rating < 1 or rating > 5:
                errors["rating"] = "Rating must be between 1 and 5."
        except ValueError:
            errors["rating"] = "Rating must be a number."
    return errors


def validate_contact(data: dict[str, Any], partial: bool = False) -> dict[str, str]:
    required = [] if partial else ["name", "email", "message"]
    return require_fields(data, required)


def validate_service(data: dict[str, Any], partial: bool = False) -> dict[str, str]:
    required = [] if partial else ["title", "description"]
    return require_fields(data, required)


# --- API Routes ---

@app.route("/api/projects", methods=["GET", "POST", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_projects():
    if request.method == "OPTIONS":
        return success_response()
    if request.method == "GET":
        visible = [public_project(project) for project in repository.list_projects(public_only=True)]
        return success_response({"projects": visible})

    data = request_payload()
    errors = validate_project(data)
    if errors:
        return error_response("Invalid project data.", 400, errors)
    project = repository.create_project(
        {
            "title": data["title"].strip(),
            "category": data["category"].strip(),
            "description": data["description"].strip(),
            "technologies": (data.get("technologies") or data.get("tech") or "").strip(),
            "image": (data.get("image") or "").strip(),
            "status": data.get("status") or "Draft",
            "featured": bool(data.get("featured")),
        }
    )
    return success_response({"project": project}, 201)


@app.route("/api/projects/<item_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_project_detail(item_id: str):
    if request.method == "OPTIONS":
        return success_response()
    project_id = parse_id(item_id)
    if project_id is None:
        return error_response("Invalid project id.", 400)
    if request.method == "GET":
        project = repository.get_project(project_id)
        if not project:
            return error_response("Project not found.", 404)
        return success_response({"project": project})
    if request.method == "DELETE":
        if not repository.delete_project(project_id):
            return error_response("Project not found.", 404)
        return success_response({"message": "Project deleted."})

    data = request_payload()
    errors = validate_project(data, partial=True)
    if errors:
        return error_response("Invalid project data.", 400, errors)
    project = repository.update_project(project_id, data)
    if not project:
        return error_response("Project not found.", 404)
    return success_response({"project": project})


@app.route("/api/reviews", methods=["GET", "POST", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_reviews():
    if request.method == "OPTIONS":
        return success_response()
    if request.method == "GET":
        reviews = [review for review in repository.list_reviews() if review.get("status") != "Hidden"]
        return success_response({"reviews": reviews})
    data = request_payload()
    normalized = {
        "client_name": (data.get("client_name") or data.get("client") or "").strip(),
        "company_name": (data.get("company_name") or data.get("role") or "").strip(),
        "review": (data.get("review") or data.get("message") or "").strip(),
        "rating": data.get("rating") or 5,
        "client_image": (data.get("client_image") or "").strip(),
        "status": data.get("status") or "Visible",
    }
    errors = validate_review(normalized)
    if errors:
        return error_response("Invalid review data.", 400, errors)
    return success_response({"review": repository.create_review(normalized)}, 201)


@app.route("/api/reviews/<item_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_review_detail(item_id: str):
    if request.method == "OPTIONS":
        return success_response()
    review_id = parse_id(item_id)
    if review_id is None:
        return error_response("Invalid review id.", 400)
    if request.method == "GET":
        review = repository.get_review(review_id)
        if not review:
            return error_response("Review not found.", 404)
        return success_response({"review": review})
    if request.method == "DELETE":
        if not repository.delete_review(review_id):
            return error_response("Review not found.", 404)
        return success_response({"message": "Review deleted."})
    data = request_payload()
    normalized = {
        "client_name": data.get("client_name") or data.get("client"),
        "company_name": data.get("company_name") or data.get("role"),
        "review": data.get("review") or data.get("message"),
        "rating": data.get("rating"),
        "client_image": data.get("client_image"),
        "status": data.get("status"),
    }
    normalized = {key: value for key, value in normalized.items() if value is not None}
    errors = validate_review(normalized, partial=True)
    if errors:
        return error_response("Invalid review data.", 400, errors)
    review = repository.update_review(review_id, normalized)
    if not review:
        return error_response("Review not found.", 404)
    return success_response({"review": review})


@app.route("/api/contacts", methods=["GET", "POST", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_contacts():
    if request.method == "OPTIONS":
        return success_response()
    if request.method == "GET":
        return success_response({"contacts": repository.list_contacts()})
    payload = request.get_json(silent=True) or request.form
    name = (payload.get("name") or payload.get("fullName") or "").strip()
    email = (payload.get("email") or payload.get("workEmail") or "").strip()
    message = (payload.get("message") or "").strip()
    company = (payload.get("company") or "").strip()
    data = {
        "name": name,
        "email": email,
        "phone": (payload.get("phone") or "").strip(),
        "service": (payload.get("service") or "").strip(),
        "message": f"Company: {company}\n\n{message}" if company else message,
        "status": payload.get("status") or "New",
    }
    errors = validate_contact(data)
    if errors:
        return error_response("Name, email, and message are required.", 400, errors)
    contact = repository.create_contact(data)
    return success_response({"contact": contact}, 201)


@app.route("/api/contacts/<item_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_contact_detail(item_id: str):
    if request.method == "OPTIONS":
        return success_response()
    contact_id = parse_id(item_id)
    if contact_id is None:
        return error_response("Invalid contact id.", 400)
    if request.method == "GET":
        contact = repository.get_contact(contact_id)
        if not contact:
            return error_response("Contact not found.", 404)
        return success_response({"contact": contact})
    if request.method == "DELETE":
        if not repository.delete_contact(contact_id):
            return error_response("Contact not found.", 404)
        return success_response({"message": "Contact deleted."})
    data = request_payload()
    errors = validate_contact(data, partial=True)
    if errors:
        return error_response("Invalid contact data.", 400, errors)
    contact = repository.update_contact(contact_id, data)
    if not contact:
        return error_response("Contact not found.", 404)
    return success_response({"contact": contact})


@app.route("/api/services", methods=["GET", "POST", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_services():
    if request.method == "OPTIONS":
        return success_response()
    if request.method == "GET":
        return success_response({"services": repository.list_services()})
    data = request_payload()
    errors = validate_service(data)
    if errors:
        return error_response("Invalid service data.", 400, errors)
    service = repository.create_service(
        {
            "title": data["title"].strip(),
            "description": data["description"].strip(),
            "icon": (data.get("icon") or "").strip(),
        }
    )
    return success_response({"service": service}, 201)


@app.route("/api/services/<item_id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
@csrf.exempt
@require_api_auth
def api_service_detail(item_id: str):
    if request.method == "OPTIONS":
        return success_response()
    service_id = parse_id(item_id)
    if service_id is None:
        return error_response("Invalid service id.", 400)
    if request.method == "GET":
        service = repository.get_service(service_id)
        if not service:
            return error_response("Service not found.", 404)
        return success_response({"service": service})
    if request.method == "DELETE":
        if not repository.delete_service(service_id):
            return error_response("Service not found.", 404)
        return success_response({"message": "Service deleted."})
    data = request_payload()
    errors = validate_service(data, partial=True)
    if errors:
        return error_response("Invalid service data.", 400, errors)
    service = repository.update_service(service_id, data)
    if not service:
        return error_response("Service not found.", 404)
    return success_response({"service": service})


# --- Clean URLs and Canonical Header Injection ---

def render_clean_html(filename: str, canonical_path: str):
    filepath = SITE_DIR / "html" / filename
    if not filepath.exists():
        return "Page not found", 404
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception:
        return "Error reading page", 500

    base_url = os.environ.get("BASE_URL")
    if not base_url:
        base_url = request.url_root.rstrip("/")
    else:
        base_url = base_url.rstrip("/")

    canonical_url = f"{base_url}{canonical_path}"
    canonical_tag = f'<link rel="canonical" href="{canonical_url}">'

    if "</head>" in content:
        content = content.replace("</head>", f"    {canonical_tag}\n</head>", 1)
    else:
        content = content.replace("<head>", f"<head>\n    {canonical_tag}", 1)

    return content, 200, {"Content-Type": "text/html; charset=utf-8"}


@app.route("/")
def public_home():
    return render_clean_html("index.html", "/")


@app.route("/about")
def public_about():
    return render_clean_html("aboutus.html", "/about")


@app.route("/services")
def public_services():
    return render_clean_html("services.html", "/services")


@app.route("/projects")
def public_projects():
    return render_clean_html("portfolio.html", "/projects")


@app.route("/blog")
def public_blog():
    return render_clean_html("blog.html", "/blog")


@app.route("/contact")
def public_contact():
    return render_clean_html("Contact.html", "/contact")


@app.route("/project-detail")
def public_project_detail():
    return render_clean_html("project-detail.html", "/project-detail")


# --- SEO files routes ---

@app.route("/sitemap.xml")
def sitemap():
    base_url = os.environ.get("BASE_URL")
    if not base_url:
        base_url = request.url_root.rstrip("/")
    else:
        base_url = base_url.rstrip("/")

    pages = [
        {"loc": "/", "priority": "1.0"},
        {"loc": "/about", "priority": "0.8"},
        {"loc": "/services", "priority": "0.8"},
        {"loc": "/projects", "priority": "0.9"},
        {"loc": "/blog", "priority": "0.6"},
        {"loc": "/contact", "priority": "0.8"}
    ]

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]
    for page in pages:
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{base_url}{page['loc']}</loc>")
        xml_lines.append(f"    <priority>{page['priority']}</priority>")
        xml_lines.append("  </url>")
    xml_lines.append('</urlset>')

    xml_content = "\n".join(xml_lines)
    return xml_content, 200, {"Content-Type": "application/xml"}


@app.route("/robots.txt")
def robots():
    base_url = os.environ.get("BASE_URL")
    if not base_url:
        base_url = request.url_root.rstrip("/")
    else:
        base_url = base_url.rstrip("/")

    content = f"User-agent: *\nAllow: /\nSitemap: {base_url}/sitemap.xml\n"
    return content, 200, {"Content-Type": "text/plain"}


# --- Old Path Redirects (301 Permanent Redirect) ---

@app.route("/html/<path:filename>")
def site_html(filename: str):
    name_lower = filename.lower()
    if name_lower == "index.html":
        return redirect("/", code=301)
    elif name_lower in ["aboutus.html", "about.html"]:
        return redirect("/about", code=301)
    elif name_lower == "services.html":
        return redirect("/services", code=301)
    elif name_lower in ["portfolio.html", "projects.html"]:
        return redirect("/projects", code=301)
    elif name_lower == "contact.html":
        return redirect("/contact", code=301)
    elif name_lower == "blog.html":
        return redirect("/blog", code=301)
    elif name_lower == "project-detail.html":
        return redirect("/project-detail", code=301)
    return send_from_directory(SITE_DIR / "html", filename)


@app.route("/portfolio")
def redirect_portfolio_root():
    return redirect("/projects", code=301)


# --- Core asset serving ---

@app.route("/css/<path:filename>")
def site_css(filename: str):
    return send_from_directory(SITE_DIR / "css", filename)


@app.route("/Js/<path:filename>")
def site_js(filename: str):
    return send_from_directory(SITE_DIR / "Js", filename)


# Render Case-Insensitive fallback for JS on Linux host
@app.route("/js/<path:filename>")
def site_lowercase_js(filename: str):
    return send_from_directory(SITE_DIR / "Js", filename)


@app.route("/images/<path:filename>")
def site_images(filename: str):
    return send_from_directory(SITE_DIR / "images", filename)


# --- Admin auth & panel routes ---

@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("admin_logged_in"):
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        with cursor() as db_cursor:
            db_cursor.execute("SELECT * FROM admins WHERE email = %s", (email,))
            admin = db_cursor.fetchone()
        if admin and check_password_hash(admin["password_hash"], password):
            session["admin_logged_in"] = True
            session["admin_name"] = admin["name"]
            flash("Welcome back, admin.", "success")
            return redirect(url_for("dashboard"))
        flash("Wrong email or password.", "error")

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    session.clear()
    flash("Logged out successfully.", "success")
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    projects = repository.list_projects()
    reviews = repository.list_reviews()
    contacts = repository.list_contacts()
    services = repository.list_services()
    stats = {
        "projects": len(projects),
        "services": len(services),
        "reviews": len(reviews),
        "contacts": len(contacts),
        "new_contacts": len([contact for contact in contacts if contact.get("status") == "New"]),
    }
    return render_template("dashboard.html", stats=stats, recent_contacts=contacts[:5])


@app.route("/projects", methods=["GET", "POST"])
@login_required
def projects():
    if request.method == "POST":
        data = {
            "title": request.form.get("title", "").strip(),
            "category": request.form.get("category", "").strip(),
            "description": request.form.get("description", "").strip(),
            "technologies": request.form.get("tech", "").strip(),
            "status": request.form.get("status", "Draft"),
            "image": save_upload(request.files.get("image")),
        }
        errors = validate_project(data)
        if errors:
            flash("Project title, category, and description are required.", "error")
        else:
            repository.create_project(data)
            flash("Project added successfully.", "success")
        return redirect(url_for("projects"))

    return render_template("projects.html", projects=repository.list_projects())


@app.route("/services", methods=["GET", "POST"])
@login_required
def admin_services():
    if request.method == "POST":
        data = {
            "title": request.form.get("title", "").strip(),
            "description": request.form.get("description", "").strip(),
            "icon": request.form.get("icon", "").strip(),
        }
        errors = validate_service(data)
        if errors:
            flash("Service title and description are required.", "error")
        else:
            repository.create_service(data)
            flash("Service added successfully.", "success")
        return redirect(url_for("admin_services"))

    return render_template("services.html", services=repository.list_services())


@app.route("/services/<item_id>/delete", methods=["POST"])
@login_required
def delete_admin_service(item_id: str):
    service_id = parse_id(item_id)
    if service_id is not None and repository.delete_service(service_id):
        flash("Service deleted.", "success")
    return redirect(url_for("admin_services"))


@app.route("/services/<item_id>/edit", methods=["POST"])
@login_required
def edit_admin_service(item_id: str):
    service_id = parse_id(item_id)
    if service_id is None:
        return redirect(url_for("admin_services"))

    data = {
        "title": request.form.get("title", "").strip(),
        "description": request.form.get("description", "").strip(),
        "icon": request.form.get("icon", "").strip(),
    }
    errors = validate_service(data)
    if errors:
        flash("Service title and description are required.", "error")
    else:
        repository.update_service(service_id, data)
        flash("Service updated successfully.", "success")
    return redirect(url_for("admin_services"))


@app.route("/projects/<item_id>/edit", methods=["POST"])
@login_required
def edit_project(item_id: str):
    project_id = parse_id(item_id)
    if project_id is None:
        return redirect(url_for("projects"))

    uploaded_image = request.files.get("image")
    data = {
        "title": request.form.get("title", "").strip(),
        "category": request.form.get("category", "").strip(),
        "description": request.form.get("description", "").strip(),
        "technologies": request.form.get("tech", "").strip(),
        "status": request.form.get("status", "Draft"),
        "image": save_upload(uploaded_image) if uploaded_image and uploaded_image.filename else None,
    }
    errors = validate_project(data)
    if errors:
        flash("Project title, category, and description are required.", "error")
    else:
        repository.update_project(project_id, data)
        flash("Project updated successfully.", "success")
    return redirect(url_for("projects"))


@app.route("/projects/<item_id>/delete", methods=["POST"])
@login_required
def delete_project(item_id: str):
    project_id = parse_id(item_id)
    if project_id is not None and repository.delete_project(project_id):
        flash("Project deleted.", "success")
    return redirect(url_for("projects"))


@app.route("/reviews", methods=["GET", "POST"])
@login_required
def reviews():
    if request.method == "POST":
        data = {
            "client_name": request.form.get("client", "").strip(),
            "company_name": request.form.get("role", "").strip(),
            "rating": request.form.get("rating", "5"),
            "review": request.form.get("message", "").strip(),
            "status": request.form.get("status", "Visible"),
        }
        errors = validate_review(data)
        if errors:
            flash("Client name and review message are required.", "error")
        else:
            repository.create_review(data)
            flash("Review added successfully.", "success")
        return redirect(url_for("reviews"))

    return render_template("reviews.html", reviews=repository.list_reviews())


@app.route("/reviews/<item_id>/edit", methods=["POST"])
@login_required
def edit_review(item_id: str):
    review_id = parse_id(item_id)
    if review_id is None:
        return redirect(url_for("reviews"))

    data = {
        "client_name": request.form.get("client", "").strip(),
        "company_name": request.form.get("role", "").strip(),
        "rating": request.form.get("rating", "5"),
        "review": request.form.get("message", "").strip(),
        "status": request.form.get("status", "Visible"),
    }
    errors = validate_review(data)
    if errors:
        flash("Client name and review message are required.", "error")
    else:
        repository.update_review(review_id, data)
        flash("Review updated successfully.", "success")
    return redirect(url_for("reviews"))


@app.route("/reviews/<item_id>/delete", methods=["POST"])
@login_required
def delete_review(item_id: str):
    review_id = parse_id(item_id)
    if review_id is not None and repository.delete_review(review_id):
        flash("Review deleted.", "success")
    return redirect(url_for("reviews"))


@app.route("/contacts", methods=["GET", "POST"])
@login_required
def contacts():
    if request.method == "POST":
        data = {
            "name": request.form.get("name", "").strip(),
            "email": request.form.get("email", "").strip(),
            "phone": request.form.get("phone", "").strip(),
            "service": request.form.get("service", "").strip(),
            "message": request.form.get("message", "").strip(),
            "status": "New",
        }
        errors = validate_contact(data)
        if errors:
            flash("Name, email, and message are required.", "error")
        else:
            repository.create_contact(data)
            flash("Contact lead added.", "success")
        return redirect(url_for("contacts"))

    return render_template("contacts.html", contacts=repository.list_contacts())


@app.route("/contacts/<item_id>/status", methods=["POST"])
@login_required
def update_contact_status(item_id: str):
    contact_id = parse_id(item_id)
    if contact_id is not None:
        repository.update_contact(contact_id, {"status": request.form.get("status", "New")})
        flash("Contact status updated.", "success")
    return redirect(url_for("contacts"))


@app.route("/contacts/<item_id>/delete", methods=["POST"])
@login_required
def delete_contact(item_id: str):
    contact_id = parse_id(item_id)
    if contact_id is not None and repository.delete_contact(contact_id):
        flash("Contact deleted.", "success")
    return redirect(url_for("contacts"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
