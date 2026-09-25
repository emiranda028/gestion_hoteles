"""Reportes de ejemplo con el formato exacto de Opera y números inventados."""
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

FLASH = """Hotel Ejemplo Centro 25-09-26
06:58
F116 Manager - Flash
2026 2026 2026
DAY MONTH YEAR
Total Rooms in Hotel 200 4800 53800
Rooms Occupied 150 3600 40000
Rooms Occupied minus House Use 149 3590 39900
House Use Rooms 1 10 100
Total In-House Persons 240 5800 62000
% Rooms Occupied 75.00 75.00 74.35
Arrival Rooms 40 1200 14000
Filter Calendar/Month to Date 24-09-26 Page 1 of 2 manager_report
Room Class All
Currency USD
Net
Hotel Ejemplo Centro 25-09-26
F116 Manager - Flash
ADR 150.00 148.50 140.25
Room Revenue 22,500.00 534,600.00 5,610,000.00
Food And Beverage Revenue 5,000.50 120,000.00 1,300,000.00
Other Revenue -120.00 3,000.00 40,000.00
Total Revenue 27,380.50 657,600.00 6,950,000.00
% Rooms Occupied for Tomorrow 81.50
Filter Calendar/Month to Date 24-09-26 Page 2 of 2 manager_report
Currency USD
"""

HF = """Hotel Ejemplo Centro 25-09-26
06:54
R106 History and Forecast
Date Total Arr. Comp. House Deduct Deduct Occ.% Room Revenue Average Rate Dep. Day Use No Show OOO Adl. &
Occ. Rooms Rooms Use Indiv. Group Rooms Rooms Rooms Rooms Chl.
History
29-09-26 Tue 100 30 1 0 80 20 50.00% 15,000.00 150.00 25 0 2 3 160
Subtotal 100 30 1 0 80 20 50.00% 15,000.00 150.00 25 0 2 3 160
Forecast
30-09-26 Wed 120 40 0 1 90 30 60.00% 19,200.00 160.00 20 0 1 190
Subtotal 120 40 0 1 90 30 60.00% 19,200.00 160.00 20 0 1 190
Total 220 70 1 1 170 50 55.00% 34,200.00 155.45 45 0 2 4 350
Filter From Date 29-09-26 To Date 30-09-26 Page 1 of 1 history_forecast
Room Class All Room Type All
Room Revenue Net Currency USD Distributed N
"""

# Variante con columnas No deducidas (City Express, Sheraton MDQ)
HF_NON_DED = """Hotel Ejemplo Costa 25-09-26
03:44
R106 History and Forecast
Date Total Arr. Comp. House DeductNon-Ded. Deduct Non-Ded. Occ.% Room Revenue Average Rate Dep. Day Use No Show OOO Adl. &
Occ. Rooms Rooms Use Indiv. Indiv. Group Group Rooms Rooms Rooms Rooms Chl.
Forecast
01-10-26 Thu 40 10 0 0 30 2 8 0 80.00% 5,600.00 140.00 5 0 1 62
02-10-26 Fri 45 12 0 0 35 0 10 0 90.00% 6,750.00 150.00 7 0 0 70
Subtotal 85 22 0 0 65 2 18 0 85.00% 12,350.00 145.29 12 0 1 132
Total 85 22 0 0 65 2 18 0 85.00% 12,350.00 145.29 12 0 1 132
Filter From Date 01-10-26 To Date 31-10-26 Page 1 of 1 history_forecast
Room Revenue Net Currency USD Distributed N
"""

ELITE = """Hotel Ejemplo Centro 25-09-26
06:57
J146 Elite Arrivals
Room Guest Name CRS No./Conf. No. C-Company Prs.Room Type Arr. Time Arr. Date Dep. DateMembership ID VIP Bonus Code Rate Code Room Rate
Arrival Date 25-09-26
Membership Level Gold Elite
0101 Perez,Juan 111 / 222 1KING 00:00 25-09-26 26-09-26 123 ABC 150.00
0102 Gomez,Ana 333 / 444 1KING 00:00 25-09-26 27-09-26 456 ABC 150.00
Subtotal Level: 2
Membership Level Member (MRD)
0103 Diaz,Luis 555 / 666 1KING 00:00 25-09-26 26-09-26 789 ABC 120.00
Subtotal Level: 1
Subtotal Arrival: 3
Total Report: 3
"""


def pdf(texto: str) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    y = 800
    for linea in texto.splitlines():
        c.drawString(20, y, linea)
        y -= 14
        if y < 40:
            c.showPage()
            y = 800
    c.save()
    return buf.getvalue()
