import os

from flask import Flask, jsonify, request, redirect, url_for

from config import Config, DB_DIR
from extensions import db, login_manager, cors


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # --- Initialize extensions ---
    db.init_app(app)
    login_manager.init_app(app)
    cors.init_app(app, supports_credentials=True)

    login_manager.login_view = 'pages.index'

    from models import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Authentication required. Please log in.'}), 401
        return redirect(url_for('pages.index'))

    # --- Register blueprints ---
    from routes.pages import pages_bp
    from routes.auth import auth_bp
    from routes.accounts import accounts_bp
    from routes.transactions import transactions_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(transactions_bp)

    # --- Error handlers ---
    @app.errorhandler(404)
    def not_found(_e):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Resource not found'}), 404
        return jsonify({'error': 'Page not found'}), 404

    @app.errorhandler(500)
    def server_error(_e):
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

    # --- Database setup ---
    os.makedirs(DB_DIR, exist_ok=True)
    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
