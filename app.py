import os
import random
import re
from datetime import datetime, timedelta
from functools import wraps

from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, Response, flash, jsonify, redirect, render_template, request, session, url_for
from flask_mail import Mail, Message
from pymongo import ASCENDING, MongoClient
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash


load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-this-secret-key")
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", "587"))
app.config["MAIL_USE_TLS"] = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
app.config["MAIL_USE_SSL"] = os.getenv("MAIL_USE_SSL", "false").lower() == "true"
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME", "")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD", "")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER", app.config["MAIL_USERNAME"])

mail = Mail(app)

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
mongo_db_name = os.getenv("MONGO_DB_NAME", "movie_stream")
client = MongoClient(mongo_uri)
db = client[mongo_db_name]

users_collection = db["users"]
movies_collection = db["movies"]
otp_collection = db["otp_verifications"]
categories_collection = db["categories"]

ADMIN_PIN = os.getenv("ADMIN_PIN", "2029")
OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))
DEFAULT_CATEGORIES = ["Action", "Comedy", "Horror", "Drama"]


def utc_now():
    return datetime.utcnow()


def bootstrap_database():
    users_collection.create_index([("email", ASCENDING)], unique=True)
    categories_collection.create_index([("name", ASCENDING)], unique=True)
    otp_collection.create_index([("email", ASCENDING)], unique=True)
    ensure_default_categories()


def ensure_default_categories():
    for category_name in DEFAULT_CATEGORIES:
        categories_collection.update_one(
            {"name": category_name},
            {"$setOnInsert": {"name": category_name, "created_at": utc_now()}},
            upsert=True,
        )


def clean_expired_otps():
    otp_collection.delete_many({"expires_at": {"$lt": utc_now()}})


def reset_signup_flow():
    for key in [
        "signup_email",
        "signup_email_verified",
        "signup_name",
        "signup_age",
        "signup_password_hash",
    ]:
        session.pop(key, None)


def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            flash("Please log in to continue.", "warning")
            return redirect(url_for("login"))
        return view_func(*args, **kwargs)

    return wrapper


def admin_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if not session.get("is_admin"):
            flash("Admin access is required.", "warning")
            return redirect(url_for("admin_login"))
        return view_func(*args, **kwargs)

    return wrapper


def build_embed_url(video_url):
    if not video_url:
        return ""

    youtube_patterns = [
        r"youtu\.be/([^?&/]+)",
        r"youtube\.com/watch\?v=([^?&/]+)",
        r"youtube\.com/embed/([^?&/]+)",
    ]
    for pattern in youtube_patterns:
        match = re.search(pattern, video_url)
        if match:
            return f"https://www.youtube.com/embed/{match.group(1)}"

    vimeo_match = re.search(r"vimeo\.com/(\d+)", video_url)
    if vimeo_match:
        return f"https://player.vimeo.com/video/{vimeo_match.group(1)}"

    return video_url


def normalize_url(value):
    normalized = (value or "").strip()
    if normalized and not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", normalized):
        normalized = f"https://{normalized.lstrip('/')}"
    return normalized


def serialize_movie(movie):
    return {
        "id": str(movie["_id"]),
        "title": movie.get("title", ""),
        "category": movie.get("category", ""),
        "thumbnail": movie.get("thumbnail", ""),
        "video_url": movie.get("video_url", ""),
        "embed_url": build_embed_url(movie.get("video_url", "")),
        "description": movie.get("description", ""),
        "is_trending": movie.get("is_trending", False),
    }


def send_otp_email(recipient_email, otp_code):
    message = Message(
        subject="Your MovieStream verification code",
        recipients=[recipient_email],
    )
    message.body = (
        "Welcome to MovieStream.\n\n"
        f"Your one-time password is: {otp_code}\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes."
    )
    mail.send(message)


def get_category_names():
    categories = categories_collection.find({}, {"name": 1}).sort("name", ASCENDING)
    names = [category["name"] for category in categories]
    if "Uncategorized" not in names:
        names.append("Uncategorized")
    return names


def build_dashboard_sections(search_term="", selected_category=""):
    query = {}
    if search_term:
        query["title"] = {"$regex": re.escape(search_term), "$options": "i"}
    if selected_category:
        query["category"] = selected_category

    movie_docs = list(movies_collection.find(query).sort("created_at", -1))
    serialized = [serialize_movie(movie) for movie in movie_docs]

    if search_term or selected_category:
        # For search or specific category, return as a single section
        label = f"Results for '{search_term}'" if search_term else selected_category
        return {label: serialized}

    sections = {}
    # 1. Trending first
    trending = [movie for movie in serialized if movie["is_trending"]]
    if trending:
        sections["Trending Now"] = trending

    # 2. Categorized sections (only if they have movies)
    for category_name in get_category_names():
        category_movies = [movie for movie in serialized if movie["category"] == category_name]
        if category_movies:
            sections[category_name] = category_movies

    # 3. Handle entirely empty state
    if not sections and serialized:
        sections["All Movies"] = serialized

    return sections


@app.context_processor
def inject_globals():
    return {
        "current_year": datetime.now().year,
        "is_logged_in": bool(session.get("user_id")),
        "is_admin": bool(session.get("is_admin")),
        "current_user_name": session.get("user_name"),
    }


@app.route("/")
def home():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    if session.get("is_admin"):
        return redirect(url_for("admin_dashboard"))
    return redirect(url_for("login"))


@app.get("/sw.js")
def service_worker():
    response = Response(
        render_template("sw.js"),
        mimetype="application/javascript",
    )
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Service-Worker-Allowed"] = "/"
    return response


@app.route("/signup")
def signup():
    requested_step = request.args.get("step", "1")
    allowed_step = 1
    if session.get("signup_email"):
        allowed_step = 2
    if session.get("signup_email_verified"):
        allowed_step = 3

    try:
        current_step = int(requested_step)
    except ValueError:
        current_step = 1

    current_step = max(1, min(current_step, 6))
    if current_step > allowed_step:
        current_step = allowed_step

    return render_template(
        "signup.html",
        email=session.get("signup_email", ""),
        email_verified=bool(session.get("signup_email_verified")),
        name=session.get("signup_name", ""),
        age=session.get("signup_age", ""),
        current_step=current_step,
    )


@app.post("/signup/send-otp")
def signup_send_otp():
    clean_expired_otps()
    email = request.form.get("email", "").strip().lower()

    if not email:
        flash("Email is required.", "danger")
        return redirect(url_for("signup"))

    if users_collection.find_one({"email": email}):
        flash("An account with this email already exists.", "danger")
        return redirect(url_for("signup"))

    otp_code = f"{random.randint(100000, 999999)}"
    otp_collection.update_one(
        {"email": email},
        {
            "$set": {
                "email": email,
                "otp_hash": generate_password_hash(otp_code),
                "expires_at": utc_now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
                "created_at": utc_now(),
                "verified": False,
            }
        },
        upsert=True,
    )

    try:
        send_otp_email(email, otp_code)
    except Exception:
        flash("Unable to send OTP email. Please verify your mail settings.", "danger")
        return redirect(url_for("signup"))

    reset_signup_flow()
    session["signup_email"] = email
    flash("OTP sent successfully. Check your email.", "success")
    return redirect(url_for("signup", step=2))


@app.post("/signup/verify-otp")
def signup_verify_otp():
    clean_expired_otps()
    email = session.get("signup_email")
    otp_code = request.form.get("otp", "").strip()

    if not email:
        flash("Enter your email first.", "warning")
        return redirect(url_for("signup"))

    otp_entry = otp_collection.find_one({"email": email})
    if not otp_entry:
        flash("No OTP request found for this email.", "danger")
        return redirect(url_for("signup"))

    if otp_entry["expires_at"] < utc_now():
        otp_collection.delete_one({"_id": otp_entry["_id"]})
        reset_signup_flow()
        flash("OTP expired. Please request a new code.", "danger")
        return redirect(url_for("signup"))

    if not check_password_hash(otp_entry["otp_hash"], otp_code):
        flash("Invalid OTP. Please try again.", "danger")
        return redirect(url_for("signup"))

    otp_collection.update_one(
        {"_id": otp_entry["_id"]},
        {"$set": {"verified": True, "verified_at": utc_now()}},
    )
    session["signup_email_verified"] = True
    flash("Email verified. Complete the rest of the form.", "success")
    return redirect(url_for("signup", step=3))


@app.post("/signup/create-account")
def signup_create_account():
    email = session.get("signup_email")
    email_verified = session.get("signup_email_verified")
    name = request.form.get("name", "").strip()
    age = request.form.get("age", "").strip()
    password = request.form.get("password", "")
    confirm_password = request.form.get("confirm_password", "")
    accepted_terms = request.form.get("accept_terms") == "on"

    session["signup_name"] = name
    session["signup_age"] = age

    if not email or not email_verified:
        flash("Please verify your email with OTP first.", "danger")
        return redirect(url_for("signup", step=1))

    if not name:
        flash("Name is required.", "danger")
        return redirect(url_for("signup", step=3))

    if not age.isdigit():
        flash("Age must be a valid number.", "danger")
        return redirect(url_for("signup", step=4))

    age_value = int(age)
    if age_value < 18:
        flash("You must be at least 18 years old to access the platform.", "danger")
        return redirect(url_for("signup", step=4))

    if len(password) < 8:
        flash("Password must be at least 8 characters long.", "danger")
        return redirect(url_for("signup", step=5))

    if password != confirm_password:
        flash("Passwords do not match.", "danger")
        return redirect(url_for("signup", step=5))

    if not accepted_terms:
        flash("You must accept the Terms & Conditions to continue.", "danger")
        return redirect(url_for("signup", step=6))

    otp_entry = otp_collection.find_one({"email": email, "verified": True})
    if not otp_entry:
        reset_signup_flow()
        flash("Email verification is incomplete. Please start again.", "danger")
        return redirect(url_for("signup", step=1))

    try:
        users_collection.insert_one(
            {
                "name": name,
                "email": email,
                "age": age_value,
                "password_hash": generate_password_hash(password),
                "accepted_terms": True,
                "created_at": utc_now(),
            }
        )
    except DuplicateKeyError:
        reset_signup_flow()
        flash("An account with this email already exists.", "danger")
        return redirect(url_for("login"))

    otp_collection.delete_one({"_id": otp_entry["_id"]})
    reset_signup_flow()
    flash("Account created successfully. Please log in.", "success")
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        accept_terms = request.form.get("accept_terms") == "on"
        user = users_collection.find_one({"email": email})

        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid email or password.", "danger")
            return redirect(url_for("login"))

        if user.get("age", 0) < 18:
            flash("You must be at least 18 years old to use this platform.", "danger")
            return redirect(url_for("login"))

        if not accept_terms or not user.get("accepted_terms"):
            flash("You must accept the Terms & Conditions before access.", "danger")
            return redirect(url_for("login"))

        session.clear()
        session["user_id"] = str(user["_id"])
        session["user_name"] = user["name"]
        session["user_email"] = user["email"]
        flash(f"Welcome back, {user['name']}.", "success")
        return redirect(url_for("dashboard"))

    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    search_term = request.args.get("q", "").strip()
    selected_category = request.args.get("category", "").strip()
    return render_template(
        "dashboard.html",
        sections=build_dashboard_sections(search_term, selected_category),
        categories=get_category_names(),
        search_term=search_term,
        selected_category=selected_category,
    )


@app.get("/api/movies")
@login_required
def movies_api():
    search_term = request.args.get("q", "").strip()
    selected_category = request.args.get("category", "").strip()
    return jsonify({"sections": build_dashboard_sections(search_term, selected_category), "categories": get_category_names()})


@app.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        admin_pin = request.form.get("pin", "").strip()
        if admin_pin != ADMIN_PIN:
            flash("Invalid admin PIN.", "danger")
            return redirect(url_for("admin_login"))

        session.clear()
        session["is_admin"] = True
        flash("Admin access granted.", "success")
        return redirect(url_for("admin_dashboard"))

    return render_template("admin_login.html")


@app.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    categories = list(categories_collection.find({}).sort("name", ASCENDING))
    movies = list(movies_collection.find({}).sort("created_at", -1))
    return render_template("admin_dashboard.html", categories=categories, movies=[serialize_movie(movie) for movie in movies])


@app.post("/admin/categories")
@admin_required
def add_category():
    category_name = request.form.get("name", "").strip()
    if not category_name:
        flash("Category name is required.", "danger")
        return redirect(url_for("admin_dashboard"))

    try:
        categories_collection.insert_one({"name": category_name.title(), "created_at": utc_now()})
        flash("Category added successfully.", "success")
    except DuplicateKeyError:
        flash("Category already exists.", "warning")
    return redirect(url_for("admin_dashboard"))


@app.post("/admin/categories/<category_id>/delete")
@admin_required
def delete_category(category_id):
    try:
        category = categories_collection.find_one({"_id": ObjectId(category_id)})
    except Exception:
        category = None

    if not category:
        flash("Category not found.", "danger")
        return redirect(url_for("admin_dashboard"))

    movies_collection.update_many({"category": category["name"]}, {"$set": {"category": "Uncategorized"}})
    categories_collection.delete_one({"_id": category["_id"]})
    flash("Category deleted. Related movies were moved to Uncategorized.", "info")
    return redirect(url_for("admin_dashboard"))


@app.post("/admin/movies")
@admin_required
def add_movie():
    title = request.form.get("title", "").strip()
    category = request.form.get("category", "").strip()
    thumbnail = normalize_url(request.form.get("thumbnail", ""))
    video_url = normalize_url(request.form.get("video_url", ""))
    description = request.form.get("description", "").strip()
    is_trending = request.form.get("is_trending") == "on"

    if not title or not category or not thumbnail or not video_url:
        flash("Title, category, thumbnail, and video URL are required.", "danger")
        return redirect(url_for("admin_dashboard"))

    try:
        movies_collection.insert_one(
            {
                "title": title,
                "category": category,
                "thumbnail": thumbnail,
                "video_url": video_url,
                "description": description,
                "is_trending": is_trending,
                "created_at": utc_now(),
                "updated_at": utc_now(),
            }
        )
    except Exception:
        flash("Movie could not be added. Check the database connection and try again.", "danger")
        return redirect(url_for("admin_dashboard"))

    flash("Movie added successfully.", "success")
    return redirect(url_for("admin_dashboard"))


@app.post("/admin/movies/<movie_id>/update")
@admin_required
def update_movie(movie_id):
    title = request.form.get("title", "").strip()
    category = request.form.get("category", "").strip()
    thumbnail = normalize_url(request.form.get("thumbnail", ""))
    video_url = normalize_url(request.form.get("video_url", ""))
    description = request.form.get("description", "").strip()
    is_trending = request.form.get("is_trending") == "on"

    if not title or not category or not thumbnail or not video_url:
        flash("All movie fields except description are required.", "danger")
        return redirect(url_for("admin_dashboard"))

    try:
        movies_collection.update_one(
            {"_id": ObjectId(movie_id)},
            {
                "$set": {
                    "title": title,
                    "category": category,
                    "thumbnail": thumbnail,
                    "video_url": video_url,
                    "description": description,
                    "is_trending": is_trending,
                    "updated_at": utc_now(),
                }
            },
        )
    except Exception:
        flash("Movie could not be updated. Check the database connection and try again.", "danger")
        return redirect(url_for("admin_dashboard"))

    flash("Movie updated successfully.", "success")
    return redirect(url_for("admin_dashboard"))


@app.post("/admin/movies/<movie_id>/delete")
@admin_required
def delete_movie(movie_id):
    movies_collection.delete_one({"_id": ObjectId(movie_id)})
    flash("Movie deleted successfully.", "info")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/logout")
def admin_logout():
    session.clear()
    flash("Admin session ended.", "info")
    return redirect(url_for("admin_login"))


# Instead of calling it at the top level, we allow the app worker to start first.
# Vercel imports 'app' and will execute the code.
# Let's ensure indices independently if needed or call it here but wrap it.

try:
    bootstrap_database()
except Exception as e:
    print(f"Warning: Primary database bootstrap failed: {e}. If this is a cold start, it's normal.")


if __name__ == "__main__":
    app.run(debug=True)
