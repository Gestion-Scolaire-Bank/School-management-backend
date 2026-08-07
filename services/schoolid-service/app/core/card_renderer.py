import io
from datetime import date
from typing import Optional

import qrcode
from PIL import Image, ImageDraw

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


def render_card(
    *,
    card_number: str,
    student_id: str,
    full_name: str,
    class_name: Optional[str],
    date_of_birth: Optional[date],
    expires_at: date,
    qr_payload: str,
) -> bytes:
    """Genere le visuel PNG de la carte d'identite scolaire (nom, classe, QR code)."""
    card = Image.new("RGB", CARD_SIZE, BACKGROUND_COLOR)
    draw = ImageDraw.Draw(card)

    draw.rectangle([(0, 0), (CARD_SIZE[0], 70)], fill=ACCENT_COLOR)
    draw.text((20, 25), "SchoolManage - Carte d'identite scolaire", fill=(255, 255, 255))

    draw.text((20, 100), f"Nom : {full_name}", fill=TEXT_COLOR)
    draw.text((20, 130), f"Classe : {class_name or '-'}", fill=TEXT_COLOR)
    draw.text((20, 160), f"Ne(e) le : {date_of_birth.isoformat() if date_of_birth else '-'}", fill=TEXT_COLOR)
    draw.text((20, 190), f"N. carte : {card_number}", fill=TEXT_COLOR)
    draw.text((20, 220), f"Identifiant eleve : {student_id}", fill=TEXT_COLOR)
    draw.text((20, 250), f"Valide jusqu'au : {expires_at.isoformat()}", fill=TEXT_COLOR)

    qr_image = _render_qr_image(qr_payload)
    card.paste(qr_image, (CARD_SIZE[0] - QR_SIZE[0] - 20, CARD_SIZE[1] - QR_SIZE[1] - 20))

    output = io.BytesIO()
    card.save(output, format="PNG")
    return output.getvalue()
