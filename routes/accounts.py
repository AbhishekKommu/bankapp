from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Account

accounts_bp = Blueprint('accounts', __name__, url_prefix='/api/accounts')

VALID_TYPES = ('Savings', 'Current', 'Fixed Deposit')


@accounts_bp.route('', methods=['GET'])
@login_required
def list_accounts():
    accounts = Account.query.filter_by(user_id=current_user.id).order_by(Account.created_at.desc()).all()
    return jsonify({'accounts': [a.to_dict() for a in accounts]}), 200


@accounts_bp.route('', methods=['POST'])
@login_required
def create_account():
    data = request.get_json(silent=True) or {}
    account_type = data.get('account_type', 'Savings')

    try:
        initial_deposit = float(data.get('initial_deposit', 0) or 0)
    except (TypeError, ValueError):
        return jsonify({'error': 'Initial deposit must be a number'}), 400

    if account_type not in VALID_TYPES:
        return jsonify({'error': f'Account type must be one of {VALID_TYPES}'}), 400
    if initial_deposit < 0:
        return jsonify({'error': 'Initial deposit cannot be negative'}), 400

    account = Account(
        account_number=Account.generate_account_number(),
        account_type=account_type,
        balance=initial_deposit,
        user_id=current_user.id,
    )
    db.session.add(account)
    db.session.commit()

    return jsonify({'message': 'Account created successfully', 'account': account.to_dict()}), 201


@accounts_bp.route('/<int:account_id>', methods=['GET'])
@login_required
def get_account(account_id):
    account = Account.query.filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    return jsonify({'account': account.to_dict()}), 200


@accounts_bp.route('/<int:account_id>', methods=['PUT'])
@login_required
def update_account(account_id):
    account = Account.query.filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404

    data = request.get_json(silent=True) or {}

    if 'account_type' in data:
        if data['account_type'] not in VALID_TYPES:
            return jsonify({'error': f'Account type must be one of {VALID_TYPES}'}), 400
        account.account_type = data['account_type']

    if 'is_active' in data:
        account.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify({'message': 'Account updated successfully', 'account': account.to_dict()}), 200


@accounts_bp.route('/<int:account_id>', methods=['DELETE'])
@login_required
def delete_account(account_id):
    account = Account.query.filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404

    if account.balance > 0:
        return jsonify({'error': 'Cannot close an account with a remaining balance. Withdraw funds first.'}), 400

    db.session.delete(account)
    db.session.commit()
    return jsonify({'message': 'Account closed successfully'}), 200


@accounts_bp.route('/<int:account_id>/transactions', methods=['GET'])
@login_required
def account_transactions(account_id):
    account = Account.query.filter_by(id=account_id, user_id=current_user.id).first()
    if not account:
        return jsonify({'error': 'Account not found'}), 404

    txns = sorted(account.transactions, key=lambda t: t.timestamp, reverse=True)
    return jsonify({'transactions': [t.to_dict() for t in txns]}), 200
