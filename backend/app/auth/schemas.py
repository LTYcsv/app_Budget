from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError('Пароль должен содержать минимум 8 символов')
    if len(v) > 128:
        raise ValueError('Пароль не должен превышать 128 символов')
    return v


class UserCreate(BaseModel):
    email: EmailStr
    # max_length prevents bcrypt DoS (bcrypt silently truncates at 72 bytes;
    # a 10 MB password string would still be hashed — just very slowly)
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class UserLogin(BaseModel):
    email: EmailStr
    # Capped at 256 to prevent oversized payloads being passed to bcrypt
    password: str = Field(min_length=1, max_length=256)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class UserOut(BaseModel):
    id: str
    email: str
    is_verified: bool

    model_config = {'from_attributes': True}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    # token is a secrets.token_urlsafe(32) — 43 chars; accept ±50% margin
    token: str = Field(min_length=20, max_length=100)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password(v)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return _validate_password(v)
