from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session

from .schemas import DepositCreate, DepositOut, GoalCreate, GoalOut, GoalsListOut
from .service import add_deposit, complete_goal, create_goal, delete_goal, list_deposits, list_goals

router = APIRouter(prefix='/savings', tags=['savings'])


@router.get('', response_model=GoalsListOut)
def get_goals(db: Session = Depends(get_db_session)):
    return list_goals(db)


@router.post('', response_model=GoalOut, status_code=201)
def post_goal(payload: GoalCreate, db: Session = Depends(get_db_session)):
    return create_goal(db, payload)


@router.delete('/{goal_id}', status_code=204)
def delete_goal_route(goal_id: str, db: Session = Depends(get_db_session)):
    delete_goal(db, goal_id)


@router.post('/{goal_id}/complete', response_model=GoalOut)
def complete_goal_route(goal_id: str, db: Session = Depends(get_db_session)):
    return complete_goal(db, goal_id)


@router.post('/{goal_id}/deposits', response_model=GoalOut, status_code=201)
def post_deposit(goal_id: str, payload: DepositCreate, db: Session = Depends(get_db_session)):
    return add_deposit(db, goal_id, payload)


@router.get('/{goal_id}/deposits', response_model=list[DepositOut])
def get_deposits(goal_id: str, db: Session = Depends(get_db_session)):
    return list_deposits(db, goal_id)
