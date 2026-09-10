from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Account, Transaction

transactions_bp = Blueprint('transactions', __name__, url_prefix='/api/transactions')


def _owned_account(account_id):
    return Account.query.filter_by(id=account_id, user_id=current_user.id).first()


def _parse_amount(raw):
    try:
        amount = float(raw)
    except (TypeError, ValueError):
        return None
    return amount


@transactions_bp.route('/deposit', methods=['POST'])
@login_required
def deposit():
    data = request.get_json(silent=True) or {}
    amount = _parse_amount(data.get('amount'))

    if amount is None:
        return jsonify({'error': 'A valid amount is required'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than zero'}), 400

    account = _owned_account(data.get('account_id'))
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    if not account.is_active:
        return jsonify({'error': 'This account is inactive'}), 400

    account.balance += amount
    txn = Transaction(
        account_id=account.id,
        transaction_type='deposit',
        amount=amount,
        balance_after=account.balance,
        description=(data.get('description') or 'Deposit').strip()[:255],
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify({
        'message': 'Deposit successful',
        'account': account.to_dict(),
        'transaction': txn.to_dict(),
    }), 201


@transactions_bp.route('/withdraw', methods=['POST'])
@login_required
def withdraw():
    data = request.get_json(silent=True) or {}
    amount = _parse_amount(data.get('amount'))

    if amount is None:
        return jsonify({'error': 'A valid amount is required'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than zero'}), 400

    account = _owned_account(data.get('account_id'))
    if not account:
        return jsonify({'error': 'Account not found'}), 404
    if not account.is_active:
        return jsonify({'error': 'This account is inactive'}), 400
    if account.balance < amount:
        return jsonify({'error': 'Insufficient balance'}), 400

    account.balance -= amount
    txn = Transaction(
        account_id=account.id,
        transaction_type='withdraw',
        amount=amount,
        balance_after=account.balance,
        description=(data.get('description') or 'Withdrawal').strip()[:255],
    )
    db.session.add(txn)
    db.session.commit()

    return jsonify({
        'message': 'Withdrawal successful',
        'account': account.to_dict(),
        'transaction': txn.to_dict(),
    }), 201


@transactions_bp.route('/transfer', methods=['POST'])
@login_required
def transfer():
    data = request.get_json(silent=True) or {}
    amount = _parse_amount(data.get('amount'))
    to_account_number = (data.get('to_account_number') or '').strip()

    if amount is None:
        return jsonify({'error': 'A valid amount is required'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than zero'}), 400
    if not to_account_number:
        return jsonify({'error': 'Recipient account number is required'}), 400

    from_account = _owned_account(data.get('from_account_id'))
    if not from_account:
        return jsonify({'error': 'Source account not found'}), 404
    if not from_account.is_active:
        return jsonify({'error': 'Source account is inactive'}), 400

    to_account = Account.query.filter_by(account_number=to_account_number).first()
    if not to_account:
        return jsonify({'error': 'Recipient account not found'}), 404
    if to_account.id == from_account.id:
        return jsonify({'error': 'Cannot transfer to the same account'}), 400
    if from_account.balance < amount:
        return jsonify({'error': 'Insufficient balance'}), 400

    from_account.balance -= amount
    to_account.balance += amount

    description = (data.get('description') or '').strip()[:255]

    out_txn = Transaction(
        account_id=from_account.id,
        related_account_id=to_account.id,
        transaction_type='transfer_out',
        amount=amount,
        balance_after=from_account.balance,
        description=description or f'Transfer to {to_account.account_number}',
    )
    in_txn = Transaction(
        account_id=to_account.id,
        related_account_id=from_account.id,
        transaction_type='transfer_in',
        amount=amount,
        balance_after=to_account.balance,
        description=description or f'Transfer from {from_account.account_number}',
    )
    db.session.add_all([out_txn, in_txn])
    db.session.commit()

    return jsonify({
        'message': 'Transfer successful',
        'account': from_account.to_dict(),
        'transaction': out_txn.to_dict(),
    }), 201
