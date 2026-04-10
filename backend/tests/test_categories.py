"""
Tests for category business rules: creation, deletion, visibility, isolation.
"""
import uuid
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.services import (
    create_category,
    delete_category,
    get_categories,
    toggle_category_visibility,
    update_category,
)
from app.schemas import CategoryCreate, CategoryUpdate
from app.models import Category

from .conftest import make_user


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_system_category(db, cat_id='sys-food', name='Еда', group='Еда',
                          cat_type='expense', is_other=False) -> Category:
    cat = Category(
        id=cat_id,
        name=name,
        group=group,
        icon='🍕',
        type=cat_type,
        is_other=is_other,
        user_id=None,   # system category
    )
    db.add(cat)
    db.flush()
    return cat


def make_custom_category(db, user_id, cat_type='expense',
                          name='Моя категория', group='Прочее') -> Category:
    cat_id = f'cat-{cat_type}-{uuid.uuid4().hex[:12]}'
    cat = Category(
        id=cat_id,
        name=name,
        group=group,
        icon='⭐',
        type=cat_type,
        is_other=False,
        user_id=user_id,
    )
    db.add(cat)
    db.flush()
    return cat


# ── get_categories ─────────────────────────────────────────────────────────────

class TestGetCategories:
    def test_returns_expense_and_income_keys(self, db):
        user = make_user(db)
        result = get_categories(db, user.id)
        assert 'expense' in result
        assert 'income' in result

    def test_system_categories_visible_to_all_users(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        make_system_category(db, 'sys-shared', 'Еда', 'Еда', 'expense')
        result_a = get_categories(db, user_a.id)
        result_b = get_categories(db, user_b.id)
        ids_a = {c.id for c in result_a['expense']}
        ids_b = {c.id for c in result_b['expense']}
        assert 'sys-shared' in ids_a
        assert 'sys-shared' in ids_b

    def test_custom_category_only_visible_to_owner(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        custom = make_custom_category(db, user_a.id)
        result_b = get_categories(db, user_b.id)
        ids_b = {c.id for c in result_b['expense']}
        assert custom.id not in ids_b

    def test_is_custom_flag_set_correctly(self, db):
        user = make_user(db)
        make_system_category(db, 'sys-x')
        custom = make_custom_category(db, user.id)
        result = get_categories(db, user.id)
        by_id = {c.id: c for c in result['expense']}
        assert by_id['sys-x'].is_custom is False
        assert by_id[custom.id].is_custom is True


# ── create_category ────────────────────────────────────────────────────────────

class TestCreateCategory:
    def test_creates_custom_category(self, db):
        user = make_user(db)
        payload = CategoryCreate(name='Кофе', group='Кафе', icon='☕')
        result = create_category(db, user.id, 'expense', payload)
        assert result.name == 'Кофе'
        assert result.is_custom is True
        assert result.id.startswith('cat-expense-')

    def test_invalid_type_raises(self, db):
        user = make_user(db)
        payload = CategoryCreate(name='Тест', group='Тест', icon='⭐')
        with pytest.raises(HTTPException) as exc:
            create_category(db, user.id, 'invalid-type', payload)
        assert exc.value.status_code == 422

    def test_parent_id_inherits_group(self, db):
        user = make_user(db)
        parent = make_system_category(db, 'sys-parent', 'Родитель', 'Родитель', 'expense')
        payload = CategoryCreate(name='Дочерняя', group='ignored', icon='⭐', parent_id=parent.id)
        result = create_category(db, user.id, 'expense', payload)
        # Group should come from parent, not payload.group
        assert result.group == parent.group

    def test_nonexistent_parent_id_raises(self, db):
        user = make_user(db)
        payload = CategoryCreate(name='Тест', group='Тест', icon='⭐', parent_id='no-such-parent')
        with pytest.raises(HTTPException) as exc:
            create_category(db, user.id, 'expense', payload)
        assert exc.value.status_code == 404

    def test_sort_order_auto_increments(self, db):
        user = make_user(db)
        cat1 = create_category(db, user.id, 'expense', CategoryCreate(name='А', group='Тест', icon='⭐'))
        cat2 = create_category(db, user.id, 'expense', CategoryCreate(name='Б', group='Тест', icon='⭐'))
        assert cat2.sort_order > cat1.sort_order


# ── delete_category ────────────────────────────────────────────────────────────

class TestDeleteCategory:
    def test_owner_can_delete_custom_category(self, db):
        user = make_user(db)
        custom = make_custom_category(db, user.id)
        delete_category(db, user.id, 'expense', custom.id)
        assert db.get(Category, custom.id) is None

    def test_system_category_cannot_be_deleted(self, db):
        user = make_user(db)
        make_system_category(db, 'sys-protected')
        with pytest.raises(HTTPException) as exc:
            delete_category(db, user.id, 'expense', 'sys-protected')
        assert exc.value.status_code == 403

    def test_other_users_category_cannot_be_deleted(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        custom = make_custom_category(db, user_a.id)
        with pytest.raises(HTTPException) as exc:
            delete_category(db, user_b.id, 'expense', custom.id)
        assert exc.value.status_code == 403

    def test_nonexistent_category_raises_404(self, db):
        user = make_user(db)
        with pytest.raises(HTTPException) as exc:
            delete_category(db, user.id, 'expense', 'nonexistent-id')
        assert exc.value.status_code == 404


# ── update_category ────────────────────────────────────────────────────────────

class TestUpdateCategory:
    def test_owner_can_update_name(self, db):
        user = make_user(db)
        custom = make_custom_category(db, user.id, name='Старое имя')
        result = update_category(db, user.id, 'expense', custom.id, CategoryUpdate(name='Новое имя'))
        assert result.name == 'Новое имя'

    def test_owner_can_update_icon(self, db):
        user = make_user(db)
        custom = make_custom_category(db, user.id)
        result = update_category(db, user.id, 'expense', custom.id, CategoryUpdate(icon='🎯'))
        assert result.icon == '🎯'

    def test_system_category_not_editable(self, db):
        user = make_user(db)
        make_system_category(db, 'sys-edit')
        with pytest.raises(HTTPException) as exc:
            update_category(db, user.id, 'expense', 'sys-edit', CategoryUpdate(name='Hack'))
        assert exc.value.status_code == 404

    def test_other_users_category_not_editable(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        custom = make_custom_category(db, user_a.id)
        with pytest.raises(HTTPException) as exc:
            update_category(db, user_b.id, 'expense', custom.id, CategoryUpdate(name='Hack'))
        assert exc.value.status_code == 404


# ── toggle_category_visibility ─────────────────────────────────────────────────

class TestToggleCategoryVisibility:
    def test_custom_category_toggles_hidden(self, db):
        user = make_user(db)
        custom = make_custom_category(db, user.id)
        assert custom.is_hidden is False

        result = toggle_category_visibility(db, user.id, 'expense', custom.id)
        assert result.is_hidden is True

        result = toggle_category_visibility(db, user.id, 'expense', custom.id)
        assert result.is_hidden is False

    def test_system_category_not_toggleable(self, db):
        user = make_user(db)
        make_system_category(db, 'sys-toggle')
        with pytest.raises(HTTPException) as exc:
            toggle_category_visibility(db, user.id, 'expense', 'sys-toggle')
        assert exc.value.status_code == 404
