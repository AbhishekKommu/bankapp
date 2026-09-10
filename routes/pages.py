from flask import Blueprint, render_template, redirect, url_for
from flask_login import current_user

pages_bp = Blueprint('pages', __name__)


@pages_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('pages.dashboard'))
    return render_template('login.html')


@pages_bp.route('/register')
def register_page():
    if current_user.is_authenticated:
        return redirect(url_for('pages.dashboard'))
    return render_template('register.html')


@pages_bp.route('/dashboard')
def dashboard():
    if not current_user.is_authenticated:
        return redirect(url_for('pages.index'))
    return render_template('dashboard.html')
