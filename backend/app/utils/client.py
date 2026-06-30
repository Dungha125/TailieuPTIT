import ipaddress

from starlette.requests import Request


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        if _is_valid_ip(ip):
            return ip

    real_ip = request.headers.get("X-Real-IP")
    if real_ip and _is_valid_ip(real_ip.strip()):
        return real_ip.strip()

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _is_valid_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False
