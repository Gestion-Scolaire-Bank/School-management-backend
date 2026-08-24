import io
from datetime import date
from typing import Optional

import qrcode
import httpx
from PIL import Image, ImageDraw, ImageColor

CARD_SIZE = (640, 400)
BACKGROUND_COLOR = (255, 255, 255)
ACCENT_COLOR = (15, 76, 129)
TEXT_COLOR = (20, 20, 20)
QR_SIZE = (150, 150)


def _render_qr_image(payload: str) -> Image.Image:
    buffer = io.BytesIO()
    qrcode.make(payload).save(buffer, format="PNG")
    buffer.seek(0)
    return Image.open(buffer).convert("RGB").resize(QR_SIZE)


def _fetch_image(url: Optional[str], size: tuple[int, int]) -> Optional[Image.Image]:
    if not url:
        return None
    try:
        response = httpx.get(url, timeout=3.0)
        if response.status_code == 200:
            return Image.open(io.BytesIO(response.content)).convert("RGBA").resize(size)
    except Exception:
        pass
    return None


def render_card(
    *,
    card_number: str,
    student_id: str,
    full_name: str,
    class_name: Optional[str],
    date_of_birth: Optional[date],
    expires_at: date,
    qr_payload: str,
    school_name: Optional[str] = None,
    accent_color: Optional[str] = None,
    background_color: Optional[str] = None,
    logo_url: Optional[str] = None,
    photo_url: Optional[str] = None,
) -> bytes:
    """Genere le visuel PNG de la carte d'identite scolaire (nom, classe, QR code)."""
    # Parse accent color
    accent_rgb = ACCENT_COLOR
    if accent_color:
        try:
            accent_rgb = ImageColor.getrgb(accent_color)
        except ValueError:
            pass

    # Parse background color
    bg_rgb = BACKGROUND_COLOR
    if background_color:
        try:
            bg_rgb = ImageColor.getrgb(background_color)
        except ValueError:
            pass

    # Calculate text color based on background luminance
    luminance = 0.299 * bg_rgb[0] + 0.587 * bg_rgb[1] + 0.114 * bg_rgb[2]
    text_color = TEXT_COLOR if luminance > 128 else (240, 240, 240)

    card = Image.new("RGB", CARD_SIZE, bg_rgb)
    draw = ImageDraw.Draw(card)

    # Draw header band
    draw.rectangle([(0, 0), (CARD_SIZE[0], 70)], fill=accent_rgb)

    # Draw logo and header text
    header_title = f"{school_name} - Carte d'identite scolaire" if school_name else "SchoolManage - Carte d'identite scolaire"
    logo_img = _fetch_image(logo_url, (50, 50))
    if logo_img:
        card.paste(logo_img, (15, 10), logo_img)
        draw.text((80, 25), header_title, fill=(255, 255, 255))
    else:
        draw.text((20, 25), header_title, fill=(255, 255, 255))

    # Draw student info
    draw.text((20, 100), f"Nom : {full_name}", fill=text_color)
    draw.text((20, 130), f"Classe : {class_name or '-'}", fill=text_color)
    draw.text((20, 160), f"Ne(e) le : {date_of_birth.isoformat() if date_of_birth else '-'}", fill=text_color)
    draw.text((20, 190), f"N. carte : {card_number}", fill=text_color)
    draw.text((20, 220), f"Identifiant eleve : {student_id}", fill=text_color)
    draw.text((20, 250), f"Valide jusqu'au : {expires_at.isoformat()}", fill=text_color)

    # Draw student photo
    photo_img = _fetch_image(photo_url, (120, 140))
    if photo_img:
        card.paste(photo_img, (480, 80), photo_img)
    else:
        # Draw a placeholder box
        draw.rectangle([(480, 80), (600, 220)], outline=accent_rgb, width=2)
        draw.text((495, 140), "Pas de photo", fill=text_color)

    # Draw QR code
    qr_image = _render_qr_image(qr_payload)
    card.paste(qr_image, (CARD_SIZE[0] - QR_SIZE[0] - 20, CARD_SIZE[1] - QR_SIZE[1] - 20))

    output = io.BytesIO()
    card.save(output, format="PNG")
    return output.getvalue()
