from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.models import User

from .schemas import DepositCreate, DepositOut, GoalCreate, GoalOut, GoalsListOut
from .service import add_deposit, complete_goal, create_goal, delete_goal, list_deposits, list_goals

router = APIRouter(prefix='/savings', tags=['savings'])


@router.get('', response_model=GoalsListOut)
def get_goals(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return list_goals(db, current_user.id)


@router.post('', response_model=GoalOut, status_code=201)
def post_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return create_goal(db, current_user.id, payload)


@router.delete('/{goal_id}', status_code=204)
def delete_goal_route(
    goal_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    delete_goal(db, current_user.id, goal_id)


@router.post('/{goal_id}/complete', response_model=GoalOut)
def complete_goal_route(
    goal_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return complete_goal(db, current_user.id, goal_id)


@router.post('/{goal_id}/deposits', response_model=GoalOut, status_code=201)
def post_deposit(
    goal_id: str,
    payload: DepositCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return add_deposit(db, current_user.id, goal_id, payload)


@router.get('/{goal_id}/deposits', response_model=list[DepositOut])
def get_deposits(
    goal_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return list_deposits(db, current_user.id, goal_id)
