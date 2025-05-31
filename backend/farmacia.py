import os
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query, Path, Body
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from pydantic import BaseModel, constr, conint
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, DateTime, Float, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship, joinedload
import jwt
import boto3
from botocore.exceptions import ClientError
from selenium import webdriver
from selenium.webdriver import Remote
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import urllib.parse
import stripe
import json, re, logging, requests
from rapidfuzz import fuzz
from cryptography.fernet import Fernet, InvalidToken
import secrets
from math import radians, sin, cos, sqrt, atan2
import random

load_dotenv()

# -----------------------------
# Configuración de la base de datos (MySQL)
# -----------------------------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no configurada en el entorno")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# -----------------------------
# Seguridad: Hashing y cifrado (Fernet)
# -----------------------------
# Genera una nueva clave segura
key = Fernet.generate_key()
secret = secrets.token_urlsafe(32)
# Contexto bcrypt para hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
# Clave de cifrado Fernet
FERNET_KEY = key
if not FERNET_KEY:
    raise RuntimeError("FERNET_KEY no configurada")
cipher_suite = Fernet(FERNET_KEY)

# Funciones de hashing + cifrado de contraseñas

def get_password_hash(password: str) -> str:
    # 1) genera hash bcrypt
    bcrypt_hash = pwd_context.hash(password)
    # 2) cifra el hash con Fernet
    token = cipher_suite.encrypt(bcrypt_hash.encode())
    # 3) devuelve el token en base64 (str)
    return token.decode()

def verify_password(plain_password: str, token_hash: str) -> bool:
    try:
        # 1) descifra el token a bytes -> bcrypt_hash
        decrypted = cipher_suite.decrypt(token_hash.encode())
    except Exception:
        return False
    # 2) compara con bcrypt
    return pwd_context.verify(plain_password, decrypted.decode())

# -----------------------------
# Configuración JWT
# -----------------------------
SECRET_KEY = secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# -----------------------------
# Modelos SQLAlchemy
# -----------------------------
class RoleDB(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True)

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(200))
    disabled = Column(Boolean, default=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    role = relationship("RoleDB")

class CategoryDB(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

class ProductDB(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    stock = Column(Integer)
    price = Column(Integer)
    image_filename = Column(String(200), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("CategoryDB")

class OrderDB(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"))
    address_id = Column(Integer, ForeignKey("addresses.id"), nullable=False)  # Nuevo campo obligatorio
    status = Column(String(20), default="pending")
    delivery_status = Column(String(30), default="pendiente")      # "pendiente", "en camino", "entregado"
    total = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    stripe_payment_intent_id = Column(String(100), nullable=True)
    payment_status = Column(String(20), default="unpaid")
    client = relationship("UserDB")
    address = relationship("AddressDB")
    items = relationship("OrderItemDB", back_populates="order")

class OrderItemDB(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    
    order = relationship("OrderDB", back_populates="items")
    product = relationship("ProductDB")

# Nuevos modelos para movimientos económicos
class FinancialMovementDB(Base):
    __tablename__ = "financial_movements"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    amount = Column(Float)
    description = Column(String(255))

class StockMovementDB(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    change = Column(Integer)  # negativo para disminución, positivo para aumento
    description = Column(String(255))

class ExternalPrice(Base):
    __tablename__ = "external_prices"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    price = Column(String(20), nullable=False)
    url = Column(String(2083), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

class AddressDB(Base):
    __tablename__ = "addresses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("UserDB")

class PromotionDB(Base):
    __tablename__ = "promotions"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), nullable=False)  # "oferta" o "promocion"
    title = Column(String(100), nullable=False)
    description = Column(String(300), nullable=True)
    discount_percent = Column(Float, nullable=True)  # Para promociones
    fixed_discount = Column(Float, nullable=True)
    offer_quantity = Column(Integer, nullable=True)  # Para ofertas tipo 2x1, 3x2, etc.
    offer_pay = Column(Integer, nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    active = Column(Boolean, default=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    product = relationship("ProductDB")
    category = relationship("CategoryDB")

class UserGamificationDB(Base):
    __tablename__ = "user_gamification"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    points = Column(Integer, default=0)
    level = Column(Integer, default=1)

class MissionDB(Base):
    __tablename__ = "missions"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True)
    name = Column(String(100))
    description = Column(String(300))
    points_reward = Column(Integer)
    active = Column(Boolean, default=True)
    # semana de la misión (para reiniciar/semanal)
    week_start = Column(DateTime)
    week_end = Column(DateTime)

class UserMissionDB(Base):
    __tablename__ = "user_missions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    mission_id = Column(Integer, ForeignKey("missions.id"))
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)


# Crear todas las tablas
Base.metadata.create_all(bind=engine)

# -----------------------------
# Utilidades y funciones auxiliares
# -----------------------------
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user(db: Session, username: str) -> UserDB:
    return db.query(UserDB).filter(UserDB.username == username).first()

def authenticate_user(db: Session, username: str, password: str) -> UserDB:
    user = get_user(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def get_object_or_404(db: Session, model, obj_id: int):
    obj = db.query(model).filter(model.id == obj_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} no encontrado")
    return obj

# Función para crear JWT
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Actualización de get_current_user para usar JWT
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales de autenticación inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = get_user(db, username)
    if user is None:
        raise credentials_exception
    return user

def verify_role(required_roles: List[str]):
    def role_checker(current_user: UserDB = Depends(get_current_user)) -> UserDB:
        if current_user.role.name not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado, se requiere uno de los roles {required_roles}"
            )
        return current_user
    return role_checker

# -----------------------------
# Esquemas Pydantic
# -----------------------------
class User(BaseModel):
    id: int
    username: str
    disabled: bool = False
    role: str
    class Config:
        from_attributes = True 

class Product(BaseModel):
    id: int
    name: str
    stock: int
    price: int
    image_filename: Optional[str] = None
    category: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class ProductCreate(BaseModel):
    name: str
    stock: int
    price: int
    image_filename: Optional[str] = None
    category_id: int

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderCreateRequest(BaseModel):
    address_id: int
    items: List[OrderItemCreate]

# Esquemas para movimientos (opcionalmente se pueden crear schemas de respuesta)
class FinancialMovement(BaseModel):
    id: int
    order_id: int
    timestamp: datetime
    amount: float
    description: str

    class Config:
        from_attributes = True

class StockMovement(BaseModel):
    id: int
    product_id: int
    timestamp: datetime
    change: int
    description: str

    class Config:
        from_attributes = True

class AdminSummary(BaseModel):
    new_orders: int
    revenue: float
    total_users: int
    total_products: int
    historical_revenue: float

    class Config:
        orm_mode = True

# Esquema para respuesta de token JWT
class Token(BaseModel):
    access_token: str
    token_type: str

# Creacion de un pago
class CreatePayment(BaseModel):
    order_id: int

# Trackeo de direcciones

class AddressCreate(BaseModel):
    latitude: float
    longitude: float

class Address(BaseModel):
    id: int
    latitude: float
    longitude: float
    class Config:
        orm_mode = True

class Promotion(BaseModel):
    id: int
    type: str  # "oferta" o "promocion"
    title: str
    description: Optional[str]
    discount_percent: Optional[float]
    fixed_discount: Optional[float]
    offer_quantity: Optional[int]
    offer_pay: Optional[int]
    product_id: Optional[int]
    category_id: Optional[int]
    active: bool
    start_date: datetime
    end_date: datetime

    class Config:
        orm_mode = True

class PromotionCreate(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    fixed_discount: Optional[float] = None
    offer_quantity: Optional[int] = None
    offer_pay: Optional[int] = None
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    start_date: datetime
    end_date: datetime

# -----------------------------
# Inicialización de datos (Roles y usuario admin)
# -----------------------------
def init_db():
    db = SessionLocal()
    # Crear roles predeterminados
    admin_role = db.query(RoleDB).filter_by(name="admin").first()
    if not admin_role:
        admin_role = RoleDB(name="admin")
        db.add(admin_role)
    almacenista_role = db.query(RoleDB).filter_by(name="almacenista").first()
    if not almacenista_role:
        almacenista_role = RoleDB(name="almacenista")
        db.add(almacenista_role)
    cliente_role = db.query(RoleDB).filter_by(name="cliente").first()
    if not cliente_role:
        cliente_role = RoleDB(name="cliente")
        db.add(cliente_role)
    db.commit()
    # Crear categoria de productos
    categories = [
        "Analgésicos y Antigripales",
        "Vitaminas y suplementos",
        "Dermocosmética y Cuidado de la Piel",
        "Cuidado Capilar"
    ]
    for name in categories:
        if not db.query(CategoryDB).filter_by(name=name).first():
            db.add(CategoryDB(name=name))
    db.commit()

    # Crear usuario admin si no existe
    admin_user = db.query(UserDB).filter_by(username="admin").first()
    if not admin_user:
        admin_user = UserDB(
            username="admin",
            hashed_password=get_password_hash("fasapisecrets"),
            role_id=admin_role.id
        )
        db.add(admin_user)
        db.commit()
    db.close()

init_db()

# -----------------------------
# Instancia de FastAPI
# -----------------------------
app = FastAPI()

# -----------------------------
# Cross-Origin Resource Sharing
# -----------------------------
origins = [
    "http://localhost:3000",  # Origen de tu frontend
    "http://172.18.0.5:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Permite estos orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Configuración para acceso a S3
s3 = boto3.client("s3", region_name="us-east-1")
BUCKET_NAME = os.getenv("BUCKET_NAME", "imagenes-productos-farmacia")

#Remote WebDriver Selenium
SELENIUM_HOST = os.getenv("SELENIUM_HOST", "localhost")
SELENIUM_PORT = os.getenv("SELENIUM_PORT", "4444")

#Puerto de Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# -----------------------------
# Configuración Lambda URLs
# -----------------------------
LAMBDA_URL_PRODUCTO = "https://fnoo5iqzzf.execute-api.us-east-1.amazonaws.com/prod/validate-product"
LAMBDA_URL_USERNAME = "https://fnoo5iqzzf.execute-api.us-east-1.amazonaws.com/prod/validate-username"

# -----------------------------
# Endpoints de Autenticación y Usuarios
# -----------------------------

MAX_PAYLOAD_SIZE = 1 * 1024 * 1024  # Límite de 1MB

@app.post("/register", dependencies=[Depends(verify_role(["admin"]))])
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """Registrar un nuevo usuario (solo admin)."""

    # 1) Validar formato del username con Lambda
    try:
        lambda_response = requests.post(
            LAMBDA_URL_USERNAME,  # URL para validar el username
            json={"username": user.username},  # Solo validación del username
            headers={"Content-Type": "application/json"},
            timeout=5
        )

        if lambda_response.status_code != 200:
            body = lambda_response.json()
            error_msg = body.get("error", "Error desconocido en validación de username")
            raise HTTPException(status_code=lambda_response.status_code, detail=error_msg)
        
        # Usar username validado o el original si no viene
        validated_username = lambda_response.json().get("data", {}).get("username", user.username)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en validación de username vía Lambda: {str(e)}")

    # 2) Verificar si el username ya existe en la base de datos
    existing_user = db.query(UserDB).filter(UserDB.username == validated_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    # 3) Verificar que el rol sea válido
    role = db.query(RoleDB).filter(RoleDB.name == user.role).first()
    if not role:
        raise HTTPException(status_code=400, detail="Rol inválido")

    # 4) Crear el nuevo usuario
    new_user = UserDB(
        username=user.username,
        hashed_password=get_password_hash(user.password),
        role_id=role.id
    )
    db.add(new_user)
    db.commit()

    return {"message": "Usuario registrado exitosamente"}


@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Generar token para autenticación."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de usuario o contraseña incorrectos"
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.name}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def get_me(current_user: UserDB = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "disabled": current_user.disabled,
        "role": current_user.role.name,
    }


@app.get("/users/", response_model=List[User])
async def list_users(db: Session = Depends(get_db), current_user: UserDB = Depends(verify_role(["admin"]))):
    """Listar todos los usuarios (solo admin)."""
    users = db.query(UserDB).all()
    result = []
    for user in users:
        user_data = {
            "id": user.id,  # Agregado el campo id
            "username": user.username,
            "disabled": user.disabled,
            "role": user.role.name,
        }
        result.append(user_data)
    return result

@app.get("/users/{id}")
async def get_user_by_id(id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(verify_role(["admin"]))):
    """Obtener detalles de un usuario por ID (solo admin)."""
    user = db.query(UserDB).filter(UserDB.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    data = {"username": user.username, "disabled": user.disabled, "role": user.role.name}
    return data

@app.put("/users/{id}")
async def update_user(id: int, user_data: UserCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(verify_role(["admin"]))):
    """Actualizar datos de un usuario (solo admin)."""
    user = db.query(UserDB).filter(UserDB.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.username = user_data.username
    user.hashed_password = get_password_hash(user_data.password)
    db.commit()
    return {"message": "Usuario actualizado exitosamente"}

@app.delete("/users/{id}")
async def delete_user(id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(verify_role(["admin"]))):
    """Eliminar un usuario (solo admin)."""
    user = db.query(UserDB).filter(UserDB.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.username == "admin":
        raise HTTPException(status_code=403, detail="No puedes eliminar el usuario admin principal")
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado exitosamente"}

# -----------------------------
# Endpoints de Productos
# -----------------------------

# Configura el logging en el backend
logging.basicConfig(level=logging.DEBUG)

@app.post("/products/", dependencies=[Depends(verify_role(["admin", "almacenista"]))])
async def create_product(
    product: ProductCreate,
    confirmado: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    """
    Crear un nuevo producto.
    - Solo recibe metadata (incluyendo image_filename = key de S3, ya subida desde el frontend)
    - Realiza todas las validaciones y controles necesarios
    """

    # 1) Validar tamaño del payload (máx. 1 MB)
    raw_data = json.dumps(product.dict())
    if len(raw_data.encode('utf-8')) > 1 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Payload demasiado grande (máx. 1 MB)")

    # 2) Validación del producto vía Lambda (solo precio y stock)
    try:
        lambda_response = requests.post(
            LAMBDA_URL_PRODUCTO,
            json={"precio": product.price, "stock": product.stock},
            timeout=5
        )
        if lambda_response.status_code == 400:
            errores = json.loads(lambda_response.json()["body"])["errores"]
            raise HTTPException(status_code=400, detail=errores)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en validación de producto: {str(e)}")

    # 3) Verificar similitudes con productos existentes usando RapidFuzz
    productos = db.query(ProductDB).all()
    for existente in productos:
        similitud = fuzz.ratio(product.name.lower(), existente.name.lower())
        logging.debug(f"Similitud con el producto '{existente.name}': {similitud}")
        if similitud >= 70:
            if not confirmado:
                logging.debug(f"Similitud alta detectada: {existente.name}, se necesita confirmación.")
                return JSONResponse(
                    status_code=409,
                    content={
                        "mensaje": "Este producto es similar a uno ya existente.",
                        "producto_similar": existente.name,
                        "confirmacion_requerida": True
                    }
                )
            break

    # 4) Busca la categoría
    category = db.query(CategoryDB).filter(CategoryDB.id == product.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # 5) Sanitización para prevenir XSS
    def sanitize(val):
        return re.sub(r"[<>\"']", "", str(val)) if isinstance(val, str) else val

    sanitized = {k: sanitize(v) for k, v in product.dict().items()}

    # 6) Guardar producto (NO procesar archivos, solo guardar image_filename = key S3)
    new_product = ProductDB(
        name=sanitized["name"],
        price=sanitized["price"],
        stock=sanitized["stock"],
        image_filename=sanitized.get("image_filename"),  # solo referencia/key de S3
        category_id=sanitized["category_id"]
    )
    db.add(new_product)
    db.commit()

    logging.debug("Producto guardado exitosamente.")
    return {"message": "Producto agregado exitosamente"}

@app.get("/products/", response_model=List[Product])
async def list_products(db: Session = Depends(get_db)):
    products = db.query(ProductDB).all()
    result = []
    for p in products:
        result.append({
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "price": p.price,
            "image_filename": p.image_filename,
            "category": p.category.name if p.category else None
        })
    return result

@app.get("/products/{id}", response_model=Product)
async def get_product(id: int, db: Session = Depends(get_db)):
    product = db.query(ProductDB).filter(ProductDB.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {
        "id": product.id,
        "name": product.name,
        "stock": product.stock,
        "price": product.price,
        "image_filename": product.image_filename,
        "category": product.category.name if product.category else None
    }


@app.put("/products/{product_id}", dependencies=[Depends(verify_role(["admin", "almacenista"]))])
async def update_product(
    product_id: int = Path(..., description="ID del producto a actualizar"),
    product: ProductCreate = Body(...),  # Incluye image_filename como Optional
    confirmado: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    """
    Actualiza un producto existente.
    Si image_filename no se envía, se conserva el anterior.
    """

    # 1) Buscar producto existente
    existing_product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not existing_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # 2) Validar tamaño del payload (1MB)
    raw_data = json.dumps(product.dict())
    if len(raw_data.encode('utf-8')) > 1 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Payload demasiado grande (máx. 1 MB)")

    # 3) Validación del producto vía Lambda (solo precio y stock)
    try:
        lambda_response = requests.post(
            LAMBDA_URL_PRODUCTO,
            json={"precio": product.price, "stock": product.stock},
            timeout=5
        )
        if lambda_response.status_code == 400:
            errores = json.loads(lambda_response.json()["body"])["errores"]
            raise HTTPException(status_code=400, detail=errores)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en validación de producto: {str(e)}")

    # 4) Verificar similitudes con productos ya existentes usando RapidFuzz (ignora el mismo producto)
    productos = db.query(ProductDB).filter(ProductDB.id != product_id).all()
    for existente in productos:
        similitud = fuzz.ratio(product.name.lower(), existente.name.lower())
        logging.debug(f"Similitud con el producto '{existente.name}': {similitud}")
        if similitud >= 70:
            if not confirmado:
                logging.debug(f"Similitud alta detectada: {existente.name}, se necesita confirmación.")
                return JSONResponse(
                    status_code=409,
                    content={
                        "mensaje": "Este producto es similar a uno ya existente.",
                        "producto_similar": existente.name,
                        "confirmacion_requerida": True
                    }
                )
            break

    # 5) Busca la categoría
    category = db.query(CategoryDB).filter(CategoryDB.id == product.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    # 6) Sanitización para prevenir XSS
    def sanitize(val):
        return re.sub(r"[<>\"']", "", str(val)) if isinstance(val, str) else val

    sanitized = {k: sanitize(v) for k, v in product.dict().items()}

    # 7) Actualizar los campos
    existing_product.name = sanitized["name"]
    existing_product.price = sanitized["price"]
    existing_product.stock = sanitized["stock"]
    existing_product.category_id = sanitized["category_id"]

    # Solo cambia la imagen si viene un nuevo filename
    if "image_filename" in sanitized and sanitized["image_filename"]:
        existing_product.image_filename = sanitized["image_filename"]

    db.commit()

    logging.debug("Producto actualizado exitosamente.")
    return {"message": "Producto actualizado exitosamente"}

@app.delete("/products/{id}", dependencies=[Depends(verify_role(["admin", "almacenista"]))])
async def delete_product(id: int, db: Session = Depends(get_db)):
    """Eliminar un producto."""
    product = db.query(ProductDB).filter(ProductDB.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(product)
    db.commit()
    return {"message": "Producto eliminado exitosamente"}

@app.delete("/products/out-of-stock", dependencies=[Depends(verify_role(["admin", "almacenista"]))])
async def delete_out_of_stock_products(db: Session = Depends(get_db)):
    """Eliminar productos sin stock."""
    db.query(ProductDB).filter(ProductDB.stock == 0).delete()
    db.commit()
    return {"message": "Productos sin stock eliminados exitosamente"}

@app.get("/categories/")
async def list_categories(db: Session = Depends(get_db)):
    return db.query(CategoryDB).all()

# -----------------------------
# Endpoints de Órdenes
# -----------------------------
def get_order(db: Session, order_id: int) -> OrderDB:
    return (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items).joinedload(OrderItemDB.product))
        .filter(OrderDB.id == order_id)
        .first()
    )

@app.post("/orders/")
async def create_order(order: OrderCreateRequest, db: Session = Depends(get_db), 
                       current_user: UserDB = Depends(verify_role(["cliente", "admin"]))):
    if not order.items:
        raise HTTPException(status_code=400, detail="La orden debe contener al menos un producto")
    
    address = db.query(AddressDB).filter(AddressDB.id == order.address_id, AddressDB.user_id == current_user.id).first()
    if not address:
        raise HTTPException(400, "Dirección de envío inválida")

    new_order = OrderDB(client_id=current_user.id, address_id=order.address_id, total=0,
                        delivery_status="pendiente")
    db.add(new_order)
    db.commit()

    total_price = 0
    detailed_items = []

    for item in order.items:
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product or product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para el producto {product.name}")

        now = datetime.utcnow()
        promo = db.query(PromotionDB).filter(
            PromotionDB.active == True,
            PromotionDB.start_date <= now,
            PromotionDB.end_date >= now,
            ((PromotionDB.product_id == product.id) |
             (PromotionDB.category_id == product.category_id))
        ).first()

        unit_price = product.price
        original_price = product.price * item.quantity
        discount_applied = 0
        promo_info = None

        if promo:
            promo_info = {
                "id": promo.id,
                "type": promo.type,
                "title": promo.title,
                "description": promo.description,
                "discount_percent": promo.discount_percent,
                "fixed_discount": promo.fixed_discount,
                "offer_quantity": promo.offer_quantity,
                "offer_pay": promo.offer_pay,
            }

            if promo.type == "promocion":
                price_with_discount = unit_price
                if promo.discount_percent:
                    price_with_discount -= price_with_discount * (promo.discount_percent / 100)
                if promo.fixed_discount:
                    price_with_discount -= promo.fixed_discount
                price_with_discount = max(price_with_discount, 0)
                total_line = price_with_discount * item.quantity
                discount_applied = original_price - total_line
                total_price += total_line

            elif promo.type == "oferta" and promo.offer_quantity and promo.offer_pay:
                full_offers = item.quantity // promo.offer_quantity
                rest = item.quantity % promo.offer_quantity
                total_line = (full_offers * promo.offer_pay + rest) * unit_price
                discount_applied = original_price - total_line
                total_price += total_line
            else:
                total_price += original_price
        else:
            total_price += original_price

        product.stock -= item.quantity
        order_item = OrderItemDB(order_id=new_order.id, product_id=product.id, quantity=item.quantity)
        db.add(order_item)

        detailed_items.append({
            "product_id": product.id,
            "name": product.name,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "original_price": original_price,
            "discount_applied": discount_applied,
            "final_price": original_price - discount_applied,
            "promotion": promo_info
        })

    new_order.total = total_price
    db.commit()

    # Gamificación
    level, points = add_points_and_check_level(db, current_user.id, total_price)
    check_and_complete_missions(db, current_user.id, new_order)

    return {
        "message": "Pedido creado exitosamente",
        "order_id": new_order.id,
        "total": total_price,
        "items": detailed_items,
        "user_level": level,
        "user_points": points
    }

@app.get("/orders/")
async def list_orders(db: Session = Depends(get_db), current_user: UserDB = Depends(verify_role(["admin", "almacenista", "cliente"]))):
    """Listar órdenes según rol del usuario."""
    if current_user.role.name == "cliente":
        return db.query(OrderDB).filter(OrderDB.client_id == current_user.id).all()
    return db.query(OrderDB).all()

@app.get("/orders/{id}")
async def get_order_details(id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(verify_role(["admin", "almacenista", "cliente"]))):
    """
    Obtener detalles de una orden, incluyendo detalle de promociones/descuentos aplicados.
    """
    order = get_order(db, id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if current_user.role.name == "cliente" and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a este pedido")

    # Armar detalle de items con promociones/ahorro aplicado
    detailed_items = []
    total_price = 0

    for item in order.items:
        product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
        if not product:
            continue  # Producto eliminado, omitir

        # Buscar promoción/oferta activa (en el momento en que consultamos, no necesariamente la original)
        # Si quieres guardar la promo "congelada" tendrías que persistir el detalle al crear la orden.
        now = datetime.utcnow()
        promo = db.query(PromotionDB).filter(
            PromotionDB.active == True,
            PromotionDB.start_date <= now,
            PromotionDB.end_date >= now,
            ((PromotionDB.product_id == product.id) |
             (PromotionDB.category_id == product.category_id))
        ).first()

        unit_price = product.price
        original_price = unit_price * item.quantity
        discount_applied = 0
        promo_info = None
        final_price = original_price

        if promo:
            promo_info = {
                "id": promo.id,
                "type": promo.type,
                "title": promo.title,
                "description": promo.description,
                "discount_percent": promo.discount_percent,
                "fixed_discount": promo.fixed_discount,
                "offer_quantity": promo.offer_quantity,
                "offer_pay": promo.offer_pay,
            }
            if promo.type == "promocion":
                price_with_discount = unit_price
                if promo.discount_percent:
                    price_with_discount -= price_with_discount * (promo.discount_percent / 100)
                if promo.fixed_discount:
                    price_with_discount -= promo.fixed_discount
                price_with_discount = max(price_with_discount, 0)
                final_price = price_with_discount * item.quantity
                discount_applied = original_price - final_price
            elif promo.type == "oferta" and promo.offer_quantity and promo.offer_pay:
                full_offers = item.quantity // promo.offer_quantity
                rest = item.quantity % promo.offer_quantity
                final_price = (full_offers * promo.offer_pay + rest) * unit_price
                discount_applied = original_price - final_price

        total_price += final_price

        detailed_items.append({
            "product_id": product.id,
            "name": product.name,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "original_price": original_price,
            "discount_applied": discount_applied,
            "final_price": final_price,
            "promotion": promo_info
        })

    return {
        "order_id": order.id,
        "client_id": order.client_id,
        "address_id": order.address_id,
        "status": order.status,
        "delivery_status": order.delivery_status,
        "payment_status": order.payment_status,
        "created_at": order.created_at,
        "total": total_price,
        "items": detailed_items
    }

@app.put("/orders/{id}")
async def update_order(id: int, order_data: OrderCreateRequest, db: Session = Depends(get_db),
                       current_user: UserDB = Depends(verify_role(["admin", "almacenista", "cliente"]))):
    """
    Actualizar una orden.
    Nota: No se permite modificar el comprador; la lógica para actualizar items deberá definirse según el caso de uso.
    """
    order = get_order(db, id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if current_user.role.name == "cliente" and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para actualizar este pedido")
    # Se mantiene el cliente original y se omite la actualización de items en este ejemplo.
    db.commit()
    return {"message": "Pedido actualizado"}

@app.delete("/orders/{id}")
async def cancel_order(id: int, db: Session = Depends(get_db), 
                       current_user: UserDB = Depends(verify_role(["admin", "cliente"]))):
    """Cancelar una orden pendiente (se elimina si no está confirmada)."""
    order = get_order(db, id)
    if not order or order.status != "pending":
        raise HTTPException(status_code=400, detail="El pedido no puede ser cancelado")
    if current_user.role.name == "cliente" and order.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes cancelar este pedido")
    db.delete(order)
    db.commit()
    return {"message": "Pedido cancelado"}

@app.post("/orders/{id}/confirm")
async def confirm_order(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Confirmar una orden y registrar los movimientos económicos correspondientes.
    Permite: cliente dueño de la orden, admin o almacenista.
    """
    order = get_order(db, id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Solo el cliente dueño, admin o almacenista pueden confirmar
    is_client_owner = current_user.role.name == "cliente" and order.client_id == current_user.id
    is_admin_or_almacenista = current_user.role.name in ["admin", "almacenista"]

    if not (is_client_owner or is_admin_or_almacenista):
        raise HTTPException(status_code=403, detail="No tienes permiso para confirmar este pedido")

    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Pedido ya pagado")

    order.payment_status = "paid"
    order.status = "confirmed"
    db.commit()

    # Registrar movimiento financiero
    financial_movement = FinancialMovementDB(
        order_id=order.id,
        amount=order.total,
        description="Orden confirmada"
    )
    db.add(financial_movement)

    # Registrar movimientos de stock para cada ítem de la orden
    for item in order.items:
        stock_movement = StockMovementDB(
            product_id=item.product_id,
            change=-item.quantity,
            description="Stock disminuido por orden confirmada"
        )
        db.add(stock_movement)
    db.commit()
    return {"message": "Pedido confirmado"}

# -----------------------------
# Endpoints de Movimientos Económicos
# -----------------------------
@app.get("/financial_movements/", response_model=List[FinancialMovement])
async def list_financial_movements(db: Session = Depends(get_db), 
                                   current_user: UserDB = Depends(verify_role(["admin", "almacenista"]))):
    """Listar movimientos financieros."""
    movements = db.query(FinancialMovementDB).all()
    return movements

@app.get("/stock_movements/", response_model=List[StockMovement])
async def list_stock_movements(db: Session = Depends(get_db), 
                               current_user: UserDB = Depends(verify_role(["admin", "almacenista"]))):
    """Listar movimientos de stock."""
    movements = db.query(StockMovementDB).all()
    return movements

@app.get("/upload-url")
def generate_upload_url(
    filename: str = Query(...),
    content_type: str = Query("application/octet-stream")
):
    try:
        presigned_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": filename,
                "ContentType": content_type,
            },
            ExpiresIn=600,
        )
        return {"upload_url": presigned_url}
    except Exception as e:
        print(f"\n🚨 ERROR EN /upload-url 🚨\n{e}\n")
        raise HTTPException(status_code=500, detail=f"Error al generar URL: {str(e)}")

@app.get("/imagen/{filename}")
def get_image_url(filename: str, token: str = Depends(oauth2_scheme)):
    try:
        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": filename,
            },
            ExpiresIn=300
        )
        return {"image_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar URL de imagen: {str(e)}")

@app.get(
    "/admin/s3-images",
    dependencies=[Depends(verify_role(["admin", "almacenista"]))]
)
def list_s3_images_with_urls():
    try:
        resp = s3.list_objects_v2(Bucket=BUCKET_NAME)
        images = []
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": BUCKET_NAME, "Key": key},
                ExpiresIn=300
            )
            images.append({"key": key, "url": url})
        return {"images": images}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error listando imágenes: {e}")

# SELENIUM ENDPOINTS

@app.get(
    "/products/{product_id}/scrape-price",
    dependencies=[Depends(verify_role(["admin", "almacenista"]))]
)
def compare_price_scraping(product_id: int, db: Session = Depends(get_db)):
    product = get_object_or_404(db, ProductDB, product_id)
    query = urllib.parse.quote(product.name.lower())
    search_url = f"https://www.larebajavirtual.com/{query}?_q={query}&map=ft"

    options = FirefoxOptions()
    options.headless = True
    driver = Remote(
        command_executor=f"http://{SELENIUM_HOST}:{SELENIUM_PORT}/wd/hub",
        options=options
    )

    try:
        driver.get(search_url)
        wait = WebDriverWait(driver, 10)

        # 1) Probamos distintos selectores de contenedor
        container_selectors = [
            "div.vtex-search-result-3-x-galleryItem",
            "div.vtex-shelf-3-x-shelfItem",
            "article"  # fallback genérico
        ]

        items = []
        for sel in container_selectors:
            try:
                wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, sel)))
                items = driver.find_elements(By.CSS_SELECTOR, sel)
            except TimeoutException:
                items = []
            if items:
                logging.debug("Contenedor encontrado con selector `%s` (%d ítems)", sel, len(items))
                break

        if not items:
            # vuelca algo de HTML para inspección
            html_snippet = driver.page_source[:1000]
            logging.error("No se encontraron contenedores de producto. URL: %s\nHTML:\n%s", search_url, html_snippet)
            raise Exception("No hay resultados en la página de búsqueda")

        first = items[0]

        # 2) Intentamos extraer el precio con varios selectores CSS
        price_selectors = [
            "span.vtex-product-price-1-x-sellingPriceValue",
            "span.vtex-product-summary-2-x-sellingPriceValue",
            "span[class*='sellingPrice']",
            "span[class*='price']"
        ]
        precio_rebaja = None
        for sel in price_selectors:
            try:
                precio_rebaja = first.find_element(By.CSS_SELECTOR, sel).text.strip()
                logging.debug("Precio extraído con selector `%s`: %s", sel, precio_rebaja)
                break
            except Exception as e:
                logging.error(f"Error al extraer precio con selector `{sel}`: {e}")
                continue

        # 3) Fallback XPath: cualquier <span> con '$'
        if not precio_rebaja:
            try:
                precio_rebaja = first.find_element(
                    By.XPATH,
                    ".//span[contains(text(),'$')]"
                ).text.strip()
                logging.debug("Precio extraído con XPath genérico: %s", precio_rebaja)
            except Exception:
                precio_rebaja = None

        if not precio_rebaja:
            # vuelca el HTML del primer ítem para depuración
            item_snippet = first.get_attribute("outerHTML")[:1000]
            logging.error(
                "No se pudo extraer precio del primer ítem.\nPrimer ítem HTML:\n%s",
                item_snippet
            )
            raise Exception("Selector de precio inválido en el primer resultado")

    except Exception as e:
        raise HTTPException(503, f"Error al scrapear La Rebaja: {e}")
    finally:
        driver.quit()

    return {
        "producto": product.name,
        "precio_interno": product.price,
        "precio_rebaja": precio_rebaja,
        "url": search_url
    }

@app.post("/create-payment-intent")
def create_payment_intent(data: CreatePayment, db: Session = Depends(get_db),
                          current_user: UserDB = Depends(verify_role(["cliente", "admin"]))):
    # 1) Carga la orden
    order = db.query(OrderDB).filter(OrderDB.id == data.order_id).first()
    if not order or (current_user.role.name == "cliente" and order.client_id != current_user.id):
        raise HTTPException(404, "Orden no encontrada")
    if order.payment_status == "paid":
        raise HTTPException(400, "Orden ya pagada")

    # 2) Crea un PaymentIntent en Stripe
    intent = stripe.PaymentIntent.create(
        amount=int(order.total * 100),  # Stripe trabaja en centavos
        currency="cop",
        metadata={"order_id": order.id},
    )

    # 3) Guarda el ID en tu base
    order.stripe_payment_intent_id = intent.id
    db.commit()

    # 4) Devuelve al frontend el client_secret
    return {"clientSecret": intent.client_secret}

# -------------------------------------------------------------------
# Endpoint de resumen administrativo
# -------------------------------------------------------------------
@app.get(
    "/admin/summary",
    response_model=AdminSummary,
    dependencies=[Depends(verify_role(["admin", "almacenista"]))]
)
async def admin_summary(db: Session = Depends(get_db)):
    start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Pedidos nuevos hoy
    new_orders = db.query(func.count(OrderDB.id)) \
                   .filter(OrderDB.created_at >= start_of_day) \
                   .scalar() or 0

    # Ingresos hoy (pagados hoy)
    revenue = db.query(func.coalesce(func.sum(OrderDB.total), 0.0)) \
                .filter(
                    OrderDB.created_at >= start_of_day,
                    OrderDB.payment_status == "paid"
                ) \
                .scalar() or 0.0

    # Total usuarios
    total_users = db.query(func.count(UserDB.id)).scalar() or 0

    # Total productos
    total_products = db.query(func.count(ProductDB.id)).scalar() or 0

    # Ventas históricas (solo pedidos pagados)
    historical_revenue = db.query(func.coalesce(func.sum(OrderDB.total), 0.0)) \
                           .filter(OrderDB.payment_status == "paid") \
                           .scalar() or 0.0

    return AdminSummary(
        new_orders=new_orders,
        revenue=revenue,
        total_users=total_users,
        total_products=total_products,
        historical_revenue=historical_revenue
    )

@app.post("/addresses/", response_model=Address)
async def create_address(addr: AddressCreate, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    address = AddressDB(user_id=current_user.id, **addr.dict())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address

@app.get("/addresses/", response_model=List[Address])
async def list_addresses(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    return db.query(AddressDB).filter(AddressDB.user_id == current_user.id).all()

@app.delete("/addresses/{address_id}")
async def delete_address(address_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    address = db.query(AddressDB).filter(AddressDB.id == address_id, AddressDB.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Dirección no encontrada")
    db.delete(address)
    db.commit()
    return {"message": "Dirección eliminada"}

@app.get("/orders/{order_id}/tracking", response_model=dict)
async def order_tracking(order_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(404, "Pedido no encontrado")
    if current_user.role.name == "cliente" and order.client_id != current_user.id:
        raise HTTPException(403, "No puedes acceder a este pedido")
    if order.payment_status != "paid":
        raise HTTPException(403, "El pedido aún no ha sido pagado")

    ORIGIN = (4.653, -74.083)

    # Cálculo dinámico de alistamiento según nivel
    gam = db.query(UserGamificationDB).filter_by(user_id=order.client_id).first()
    user_level = gam.level if gam else 1
    ALISTANDO_SEC = max(60 - 10 * (user_level - 1), 20)

    SPEED_MPS = 11.1
    dest_lat, dest_lng = order.address.latitude, order.address.longitude
    origin_lat, origin_lng = ORIGIN
    now = datetime.utcnow()
    delivery_start = order.created_at + timedelta(seconds=ALISTANDO_SEC)

    def get_eta_and_pos(origin, dest, start_time, now, speed_mps):
        from math import radians, sin, cos, sqrt, atan2
        R = 6371000
        lat1, lon1 = radians(origin[0]), radians(origin[1])
        lat2, lon2 = radians(dest[0]), radians(dest[1])
        dlat, dlon = lat2 - lat1, lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1)*cos(lat2)*sin(dlon/2)**2
        c = 2*atan2(sqrt(a), sqrt(1-a))
        total_dist = R * c
        total_time = total_dist / speed_mps if speed_mps > 0 else 1
        elapsed = (now - start_time).total_seconds()
        elapsed = max(0, elapsed)
        if elapsed >= total_time:
            return dest[0], dest[1], int(total_time), True
        frac = elapsed / total_time
        lat = origin[0] + (dest[0] - origin[0]) * frac
        lng = origin[1] + (dest[1] - origin[1]) * frac
        return lat, lng, int(total_time - elapsed), False

    if now < delivery_start:
        courier_lat, courier_lng = origin_lat, origin_lng
        delivery_status = "alistando pedido"
        eta = ALISTANDO_SEC - int((now - order.created_at).total_seconds())
    else:
        courier_lat, courier_lng, eta, arrived = get_eta_and_pos(
            (origin_lat, origin_lng), (dest_lat, dest_lng), delivery_start, now, SPEED_MPS
        )
        if arrived:
            delivery_status = "entregado"
        else:
            delivery_status = "en camino"

    return {
        "order_id": order.id,
        "status": order.status,
        "payment_status": order.payment_status,
        "delivery_status": delivery_status,
        "origin": {"lat": origin_lat, "lng": origin_lng},
        "destination": {"lat": dest_lat, "lng": dest_lng},
        "courier": {"lat": courier_lat, "lng": courier_lng},
        "eta_seconds": eta,
        "user_level": user_level,
        "alistamiento_seconds": ALISTANDO_SEC
    }

# Endpoints de promociones

@app.post("/promotions/", response_model=Promotion, dependencies=[Depends(verify_role(["admin", "almacenista"]))])
async def create_promotion(promo: PromotionCreate, db: Session = Depends(get_db)):
    new_promo = PromotionDB(**promo.dict(), active=True)
    db.add(new_promo)
    db.commit()
    db.refresh(new_promo)
    return new_promo

@app.get("/promotions/", response_model=List[Promotion])
async def list_promotions(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    promos = db.query(PromotionDB).filter(
        PromotionDB.active == True,
        PromotionDB.start_date <= now,
        PromotionDB.end_date >= now
    ).all()
    return promos

@app.get("/products/{product_id}/promotions", response_model=List[Promotion])
async def product_promotions(product_id: int, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(404, "Producto no encontrado")

    promos = db.query(PromotionDB).filter(
        PromotionDB.active == True,
        PromotionDB.start_date <= now,
        PromotionDB.end_date >= now,
        ((PromotionDB.product_id == product_id) |
         (PromotionDB.category_id == product.category_id))
    ).all()
    return promos

@app.get("/categories/{category_id}/promotions", response_model=List[Promotion])
async def category_promotions(category_id: int, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    promos = db.query(PromotionDB).filter(
        PromotionDB.active == True,
        PromotionDB.start_date <= now,
        PromotionDB.end_date >= now,
        (PromotionDB.category_id == category_id)
    ).all()
    return promos

@app.put("/promotions/{promotion_id}", response_model=Promotion, dependencies=[Depends(verify_role(["admin", "almacenista"]))])
async def update_promotion(promotion_id: int, promo: PromotionCreate, db: Session = Depends(get_db)):
    promotion = db.query(PromotionDB).filter(PromotionDB.id == promotion_id).first()
    if not promotion:
        raise HTTPException(404, "Promoción no encontrada")
    for field, value in promo.dict().items():
        setattr(promotion, field, value)
    db.commit()
    db.refresh(promotion)
    return promotion

@app.delete("/promotions/{promotion_id}", dependencies=[Depends(verify_role(["admin", "almacenista"]))])
async def delete_promotion(promotion_id: int, db: Session = Depends(get_db)):
    promotion = db.query(PromotionDB).filter(PromotionDB.id == promotion_id).first()
    if not promotion:
        raise HTTPException(404, "Promoción no encontrada")
    promotion.active = False
    db.commit()
    return {"message": "Promoción desactivada exitosamente"}

def get_user_rank(level):
    RANKS = [
        {"min_level": 1, "max_level": 3, "name": "Bronce", "logo": "🥉"},
        {"min_level": 4, "max_level": 6, "name": "Plata", "logo": "🥈"},
        {"min_level": 7, "max_level": 9, "name": "Oro", "logo": "🥇"},
        {"min_level": 10, "max_level": 99, "name": "Platino", "logo": "🏆"},
    ]
    for r in RANKS:
        if r["min_level"] <= level <= r["max_level"]:
            return r
    return RANKS[0]

def add_points_and_check_level(db, user_id, amount_spent):
    gam = db.query(UserGamificationDB).filter_by(user_id=user_id).first()
    if not gam:
        gam = UserGamificationDB(user_id=user_id, points=0, level=1)
        db.add(gam)
        db.commit()
        db.refresh(gam)
    points_earned = int(amount_spent // 1000)
    gam.points += points_earned
    levels_up = gam.points // 100
    if levels_up > 0:
        gam.level += levels_up
        gam.points = gam.points % 100
    db.commit()
    return gam.level, gam.points

@app.get("/users/me/gamification")
async def get_my_gamification(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    gam = db.query(UserGamificationDB).filter_by(user_id=current_user.id).first()
    if not gam:
        gam = UserGamificationDB(user_id=current_user.id, points=0, level=1)
        db.add(gam)
        db.commit()
    rank = get_user_rank(gam.level)
    return {
        "level": gam.level,
        "points": gam.points,
        "progress_percent": int(gam.points),
        "rank_name": rank["name"],
        "rank_logo": rank["logo"]
    }

MISSIONS_POOL = [
    {"code": "all_types",    "name": "Explorador semanal",    "description": "Compra al menos un producto de cada categoría distinta.",        "points_reward": 20},
    {"code": "multi_qty",    "name": "Multi-compra",         "description": "Compra al menos 3 unidades de un mismo producto en una sola orden.",  "points_reward": 10},
    {"code": "early_bird",   "name": "Compra rápida",        "description": "Compra antes de las 9 am o después de las 9 pm.",                      "points_reward": 10},
    {"code": "vitamin_fan",  "name": "Fan de la vitamina",   "description": "Compra un producto de 'Vitaminas y suplementos'.",                     "points_reward": 15},
    {"code": "loyal_client", "name": "Cliente fiel",         "description": "Realiza 2 compras diferentes en la semana.",                            "points_reward": 20},
    {"code": "promo_hunter", "name": "Cazador de ofertas",   "description": "Compra un producto con promoción activa.",                               "points_reward": 10},
    {"code": "family_order", "name": "Compra familiar",      "description": "Agrega al menos 5 productos diferentes en una sola orden.",              "points_reward": 20},
    {"code": "first_order",  "name": "Primera compra",       "description": "Realiza tu primer pedido de la semana.",                                 "points_reward": 5},
    {"code": "big_spender",  "name": "Gran comprador",       "description": "Gasta más de $100.000 COP en un pedido.",                                "points_reward": 15},
]


@app.get("/missions/active")
def get_active_missions(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    missions = db.query(MissionDB).filter(MissionDB.active == True, MissionDB.week_start <= now, MissionDB.week_end >= now).all()
    return [
        {
            "code": m.code,
            "name": m.name,
            "description": m.description,
            "points_reward": m.points_reward
        }
        for m in missions
    ]

@app.get("/users/me/missions")
def get_my_missions(current_user: UserDB = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    # Misiones de la semana
    missions = db.query(MissionDB).filter(MissionDB.active == True, MissionDB.week_start <= now, MissionDB.week_end >= now).all()
    result = []
    for m in missions:
        user_mission = db.query(UserMissionDB).filter_by(user_id=current_user.id, mission_id=m.id).first()
        result.append({
            "code": m.code,
            "name": m.name,
            "description": m.description,
            "points_reward": m.points_reward,
            "completed": user_mission.completed if user_mission else False
        })
    return result

def check_and_complete_missions(db, user_id, order):
    now = datetime.utcnow()
    initialize_weekly_missions(db)

    missions = db.query(MissionDB).filter(
        MissionDB.active == True,
        MissionDB.week_start <= now,
        MissionDB.week_end   >= now
    ).all()

    for mission in missions:
        user_m = db.query(UserMissionDB).filter_by(user_id=user_id, mission_id=mission.id).first()
        if user_m and user_m.completed:
            continue

        # MULTI_QTY
        if mission.code == "multi_qty":
            if any(item.quantity >= 3 for item in order.items):
                completed = True

        # EARLY_BIRD
        elif mission.code == "early_bird":
            h = order.created_at.hour
            if h < 9 or h >= 21:
                completed = True

        # FAMILY_ORDER
        elif mission.code == "family_order":
            types = {item.product.category_id for item in order.items if item.product}
            if len(types) >= 5:
                completed = True

        # VITAMIN_FAN
        elif mission.code == "vitamin_fan":
            vit = db.query(CategoryDB).filter(CategoryDB.name.ilike("%vitaminas%")).first()
            if vit and any(item.product.category_id == vit.id for item in order.items):
                completed = True

        # PROMO_HUNTER
        elif mission.code == "promo_hunter":
            if any(
                db.query(PromotionDB)
                  .filter(
                      PromotionDB.active==True,
                      PromotionDB.start_date<=now,
                      PromotionDB.end_date>=now,
                      ((PromotionDB.product_id==item.product_id)|
                       (PromotionDB.category_id==item.product.category_id))
                  ).first()
                for item in order.items
            ):
                completed = True

        # ALL_TYPES
        elif mission.code == "all_types":
            cats_in = {item.product.category_id for item in order.items if item.product}
            all_cats = {c[0] for c in db.query(CategoryDB.id).all()}
            if all_cats.issubset(cats_in):
                completed = True

        # LOYAL_CLIENT
        elif mission.code == "loyal_client":
            monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
            sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
            cnt = db.query(OrderDB).filter(
                OrderDB.client_id==user_id,
                OrderDB.created_at>=monday,
                OrderDB.created_at<=sunday
            ).count()
            if cnt >= 2:
                completed = True

        # FIRST_ORDER
        elif mission.code == "first_order":
            # Si nunca tuvo esta misión completada, la marcamos en la primera orden
            if not user_m:
                completed = True

        # BIG_SPENDER
        elif mission.code == "big_spender":
            # Total calculado ya en create_order
            if order.total >= 100_000:
                completed = True

        else:
            completed = False

        # Si correspondió completarla, la guardamos y damos puntos
        if locals().get("completed"):
            if not user_m:
                user_m = UserMissionDB(
                    user_id     = user_id,
                    mission_id  = mission.id,
                    completed   = True,
                    completed_at= now
                )
                db.add(user_m)
            else:
                user_m.completed    = True
                user_m.completed_at = now

            gam = db.query(UserGamificationDB).filter_by(user_id=user_id).first()
            gam.points += mission.points_reward
            db.commit()
        # limpiar flag
        if "completed" in locals(): del completed
        
WEEKLY_MISSION_COUNT = 3
def initialize_weekly_missions(db: Session):
    # 1. Semana normalizada: lunes 00:00 -> domingo 23:59:59
    now    = datetime.utcnow()
    monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = monday
    week_end   = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)

    # 2. Si ya hay cualquier misión esta semana, no hacemos nada
    if db.query(MissionDB).filter(MissionDB.week_start == week_start).count() > 0:
        return

    # 3. Escogemos 3 al azar de nuestro pool completo
    for m in random.sample(MISSIONS_POOL, WEEKLY_MISSION_COUNT):
        db.add(MissionDB(
            code          = m["code"],
            name          = m["name"],
            description   = m["description"],
            points_reward = m["points_reward"],
            active        = True,
            week_start    = week_start,
            week_end      = week_end
        ))
    db.commit()

