from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class UserOut(BaseModel):
    id: str
    email: str

    model_config = {'from_attributes': True}
