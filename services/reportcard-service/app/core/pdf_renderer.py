from datetime import datetime, timezone
from typing import Sequence

from weasyprint import HTML

from app.models.grade import Grade


def render_bulletin_pdf(
    *,
    student_id: str,
    class_id: str,
    period: str,
    grades: Sequence[Grade],
    average: float,
    rank: int,
    class_size: int,
) -> bytes:
    rows = "".join(
        f"<tr><td>{grade.subject_name}</td><td>{grade.score}/{grade.max_score}</td><td>{grade.weight}</td></tr>"
        for grade in grades
    )
    html = f"""
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {{ font-family: sans-serif; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 1em; }}
        th, td {{ border: 1px solid #333; padding: 4px 8px; text-align: left; }}
        h1 {{ font-size: 1.4em; }}
      </style>
    </head>
    <body>
      <h1>SchoolManage - Bulletin scolaire</h1>
      <p>Eleve : {student_id}</p>
      <p>Classe : {class_id}</p>
      <p>Periode : {period}</p>
      <table>
        <thead><tr><th>Matiere</th><th>Note</th><th>Coefficient</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
      <p><strong>Moyenne : {average:.2f}/20</strong></p>
      <p><strong>Rang : {rank} / {class_size}</strong></p>
      <p>Genere le {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC</p>
    </body>
    </html>
    """
    return HTML(string=html).write_pdf()


def get_pdf_renderer():
    return render_bulletin_pdf
