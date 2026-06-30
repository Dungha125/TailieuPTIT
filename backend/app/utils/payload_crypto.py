import base64
import hashlib
import logging
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

logger = logging.getLogger(__name__)


def _key_bytes() -> bytes | None:
    raw = settings.api_payload_encryption_key.strip()
    if not raw:
        return None
    try:
        decoded = base64.b64decode(raw)
        if len(decoded) == 32:
            return decoded
    except Exception:
        pass
    return hashlib.sha256(raw.encode()).digest()


def is_enabled() -> bool:
    return settings.enable_api_payload_encryption and _key_bytes() is not None


def encrypt_bytes(plaintext: bytes) -> str:
    key = _key_bytes()
    if not key:
        raise ValueError("Payload encryption key not configured")
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext, None)
    return base64.b64encode(iv + ciphertext).decode("ascii")


def decrypt_bytes(token: str | bytes) -> bytes:
    key = _key_bytes()
    if not key:
        raise ValueError("Payload encryption key not configured")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    raw = base64.b64decode(token.strip())
    iv, ciphertext = raw[:12], raw[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext, None)
