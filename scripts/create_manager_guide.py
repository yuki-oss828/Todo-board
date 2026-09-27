from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF


OUTPUT = Path(__file__).resolve().parents[1] / "output" / "pdf" / "作業確認ボード_店長向け操作ガイド.pdf"
SITE_URL = "https://todo-board-virid.vercel.app"

PAGE_W, PAGE_H = A4
MARGIN = 42
NAVY = HexColor("#101827")
BLUE = HexColor("#1269E8")
GREEN = HexColor("#42DB9C")
SLATE = HexColor("#475569")
LIGHT = HexColor("#F4F7FB")
BORDER = HexColor("#DCE3EC")
ORANGE = HexColor("#ED6A45")
RED = HexColor("#B42318")
WHITE = colors.white

pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
FONT = "HeiseiKakuGo-W5"


def text_width(text, size):
    return pdfmetrics.stringWidth(text, FONT, size)


def wrap_text(text, size, width):
    lines = []
    current = ""
    for char in text:
        candidate = current + char
        if current and text_width(candidate, size) > width:
            lines.append(current)
            current = char
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_lines(c, text, x, y, width, size=9.5, leading=15, color=SLATE, max_lines=None):
    lines = wrap_text(text, size, width)
    if max_lines:
        lines = lines[:max_lines]
    c.setFont(FONT, size)
    c.setFillColor(color)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def header(c, page_title, page_number):
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 72, PAGE_W, 72, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.roundRect(MARGIN, PAGE_H - 56, 34, 34, 9, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONT, 17)
    c.drawCentredString(MARGIN + 17, PAGE_H - 46, "✓")
    c.setFillColor(WHITE)
    c.setFont(FONT, 16)
    c.drawString(MARGIN + 46, PAGE_H - 39, page_title)
    c.setFont(FONT, 8)
    c.setFillColor(HexColor("#B6C2D2"))
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 40, f"店長向けガイド  |  {page_number}/3")
    c.setFillColor(HexColor("#CBD5E1"))
    c.setFont(FONT, 8)
    c.drawString(MARGIN + 46, PAGE_H - 54, "作業の抜け漏れを減らし、完了状況をiPadで共有")


def footer(c):
    c.setStrokeColor(BORDER)
    c.line(MARGIN, 28, PAGE_W - MARGIN, 28)
    c.setFont(FONT, 7.5)
    c.setFillColor(SLATE)
    c.drawString(MARGIN, 16, "作業確認ボード")
    c.drawRightString(PAGE_W - MARGIN, 16, "PINはこの資料に記載せず、店長からスタッフへ別途共有してください。")


def section_title(c, title, x, y, width, accent=BLUE):
    c.setFillColor(accent)
    c.roundRect(x, y - 4, 5, 20, 2.5, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont(FONT, 13)
    c.drawString(x + 13, y, title)
    return y - 28


def card(c, x, y_top, width, height, fill=WHITE, stroke=BORDER):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.8)
    c.roundRect(x, y_top - height, width, height, 12, fill=1, stroke=1)


def numbered_step(c, number, title, detail, x, y, width, accent=BLUE):
    c.setFillColor(accent)
    c.circle(x + 14, y - 12, 12, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont(FONT, 10)
    c.drawCentredString(x + 14, y - 16, str(number))
    c.setFillColor(NAVY)
    c.setFont(FONT, 10.5)
    c.drawString(x + 34, y - 8, title)
    draw_lines(c, detail, x + 34, y - 24, width - 40, size=8.5, leading=13)


def badge(c, text, x, y, fill, text_color=WHITE):
    padding = 9
    width = text_width(text, 8.5) + padding * 2
    c.setFillColor(fill)
    c.roundRect(x, y - 14, width, 20, 10, fill=1, stroke=0)
    c.setFillColor(text_color)
    c.setFont(FONT, 8.5)
    c.drawString(x + padding, y - 8, text)
    return width


def page_one(c):
    header(c, "作業確認ボード  導入と毎日の使い方", 1)
    y = PAGE_H - 102

    c.setFillColor(NAVY)
    c.setFont(FONT, 22)
    c.drawString(MARGIN, y, "1台のiPadで、今日の作業を見える化")
    y -= 28
    draw_lines(
        c,
        "開店前・締めの作業を一覧で確認し、作業中・完了へ更新します。完了者と時刻が履歴に残るため、新人スタッフの確認漏れを減らせます。",
        MARGIN,
        y,
        PAGE_W - MARGIN * 2 - 132,
        size=9.5,
        leading=15,
    )

    qr_code = qr.QrCodeWidget(SITE_URL)
    bounds = qr_code.getBounds()
    qr_size = 92
    drawing = Drawing(qr_size, qr_size, transform=[qr_size / (bounds[2] - bounds[0]), 0, 0, qr_size / (bounds[3] - bounds[1]), 0, 0])
    drawing.add(qr_code)
    renderPDF.draw(drawing, c, PAGE_W - MARGIN - qr_size, PAGE_H - 178)
    c.setFont(FONT, 6.5)
    c.setFillColor(SLATE)
    c.drawCentredString(PAGE_W - MARGIN - qr_size / 2, PAGE_H - 188, "iPadのSafariで読み取り")

    y = PAGE_H - 218
    y = section_title(c, "最初の準備（店長が1回だけ実施）", MARGIN, y, PAGE_W - MARGIN * 2)
    card(c, MARGIN, y + 12, PAGE_W - MARGIN * 2, 128, fill=LIGHT)
    col_w = (PAGE_W - MARGIN * 2 - 28) / 3
    numbered_step(c, 1, "Safariで開く", "QRコードまたは公開URLから開き、店長から共有された4桁のアクセスPINを入力します。", MARGIN + 12, y - 2, col_w)
    numbered_step(c, 2, "ホーム画面へ追加", "Safariの共有ボタンから「ホーム画面に追加」。次回からアプリのように起動できます。", MARGIN + col_w + 16, y - 2, col_w)
    numbered_step(c, 3, "スタッフを登録", "右側の「本日のスタッフ」→「追加」から、完了者として選ぶ名前を登録します。", MARGIN + col_w * 2 + 20, y - 2, col_w)

    y -= 158
    y = section_title(c, "毎日の基本操作", MARGIN, y, PAGE_W - MARGIN * 2)
    row_h = 67
    steps = [
        ("① カテゴリを選ぶ", "開店前／締めを選択。最初は未完了の作業だけが表示されます。", BLUE),
        ("② 作業を始める", "作業左側の丸を1回押すと、未着手から「作業中」へ変わります。", BLUE),
        ("③ 完了を記録", "同じ丸をもう1回押し、完了した人の名前を選んで「完了にする」。", HexColor("#1D9A65")),
        ("④ 全体を確認", "進捗率・残り件数・完了履歴を確認。抜けがあればその場で声をかけます。", ORANGE),
    ]
    for index, (title, detail, color) in enumerate(steps):
        top = y - index * (row_h + 8)
        card(c, MARGIN, top, PAGE_W - MARGIN * 2, row_h)
        c.setFillColor(color)
        c.roundRect(MARGIN + 12, top - 51, 118, 36, 10, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT, 10)
        c.drawCentredString(MARGIN + 71, top - 37, title)
        draw_lines(c, detail, MARGIN + 145, top - 25, PAGE_W - MARGIN * 2 - 160, size=9, leading=14)

    footer(c)
    c.showPage()


def page_two(c):
    header(c, "店長が行う設定・確認", 2)
    y = PAGE_H - 105
    y = section_title(c, "作業を追加・修正する", MARGIN, y, PAGE_W - MARGIN * 2)

    left_w = 248
    gap = 16
    right_x = MARGIN + left_w + gap
    right_w = PAGE_W - MARGIN - right_x

    card(c, MARGIN, y + 8, left_w, 188)
    c.setFillColor(NAVY)
    c.setFont(FONT, 11)
    c.drawString(MARGIN + 16, y - 10, "新しい作業を追加")
    bullets = [
        "右上の「新しい作業」を押す",
        "作業内容とカテゴリを選ぶ",
        "必要なら担当者を選ぶ",
        "毎日行う作業は「毎日繰り返す」をON",
        "「追加する」で保存",
    ]
    yy = y - 38
    for item in bullets:
        c.setFillColor(GREEN)
        c.circle(MARGIN + 19, yy + 3, 3.2, fill=1, stroke=0)
        yy = draw_lines(c, item, MARGIN + 30, yy, left_w - 45, size=8.8, leading=13) - 6

    card(c, right_x, y + 8, right_w, 188)
    c.setFillColor(NAVY)
    c.setFont(FONT, 11)
    c.drawString(right_x + 16, y - 10, "修正・削除")
    draw_lines(c, "作業カード右端の「…」を押します。", right_x + 16, y - 37, right_w - 32, size=9)
    badge(c, "修正する", right_x + 16, y - 64, BLUE)
    draw_lines(c, "作業名、カテゴリ、担当、毎日繰り返す設定を変更できます。", right_x + 16, y - 88, right_w - 32, size=8.5, leading=13)
    badge(c, "削除する", right_x + 16, y - 127, RED)
    draw_lines(c, "確認画面が出ます。毎日繰り返す作業を削除すると翌日以降も表示されません。", right_x + 16, y - 151, right_w - 32, size=8.5, leading=13)

    y -= 222
    y = section_title(c, "スタッフと完了履歴を管理する", MARGIN, y, PAGE_W - MARGIN * 2)
    card(c, MARGIN, y + 8, PAGE_W - MARGIN * 2, 155, fill=LIGHT)
    items = [
        ("スタッフ追加", "右側のスタッフ欄にある「追加」から登録。完了者選択に使います。"),
        ("スタッフ削除", "名前右側のゴミ箱を押します。担当中の作業は「担当未定」に戻ります。"),
        ("完了履歴", "画面上部の「完了履歴」で、誰が・何を・いつ完了したか確認できます。"),
        ("ロック", "離席時は画面上部の「ロック」を押します。再度PINを入力するまで操作できません。"),
    ]
    item_w = (PAGE_W - MARGIN * 2 - 36) / 2
    for idx, (title, detail) in enumerate(items):
        col = idx % 2
        row = idx // 2
        xx = MARGIN + 14 + col * (item_w + 10)
        yy = y - 8 - row * 67
        c.setFillColor(BLUE if idx != 3 else NAVY)
        c.circle(xx + 7, yy - 4, 6, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont(FONT, 9.5)
        c.drawString(xx + 20, yy, title)
        draw_lines(c, detail, xx + 20, yy - 17, item_w - 22, size=8.2, leading=12)

    y -= 190
    y = section_title(c, "店長の確認ポイント", MARGIN, y, PAGE_W - MARGIN * 2, accent=ORANGE)
    checks = [
        "開店前：未完了が残っていないか",
        "締め：翌日に影響する確認漏れがないか",
        "担当未定：誰も担当していない作業が残っていないか",
        "完了履歴：同じ人に作業が偏っていないか、確認漏れが続いていないか",
    ]
    yy = y
    for item in checks:
        c.setStrokeColor(BORDER)
        c.setFillColor(WHITE)
        c.roundRect(MARGIN, yy - 28, PAGE_W - MARGIN * 2, 34, 8, fill=1, stroke=1)
        c.setFillColor(HexColor("#1D9A65"))
        c.setFont(FONT, 11)
        c.drawString(MARGIN + 14, yy - 15, "✓")
        c.setFillColor(NAVY)
        c.setFont(FONT, 8.8)
        c.drawString(MARGIN + 34, yy - 14, item)
        yy -= 42

    footer(c)
    c.showPage()


def page_three(c):
    header(c, "困ったとき・安全な運用", 3)
    y = PAGE_H - 105
    y = section_title(c, "よくある困りごと", MARGIN, y, PAGE_W - MARGIN * 2)

    rows = [
        ("PINが通らない", "4桁の数字を確認して再入力します。入力を間違えてもロックはかかりません。PINが不明な場合は店長へ確認します。"),
        ("作業が見つからない", "開店前／締めの選択と、未完了／すべての絞り込みを確認します。"),
        ("完了にできない", "完了者として選ぶスタッフが未登録です。先にスタッフを追加します。"),
        ("画面が更新されない", "Wi-Fi接続を確認し、Safariを再読み込みします。それでも直らなければ一度ロックして開き直します。"),
        ("翌日に作業が出ない", "その作業を修正し、「毎日繰り返す」がONになっているか確認します。"),
    ]
    for idx, (problem, answer) in enumerate(rows):
        top = y - idx * 64
        card(c, MARGIN, top + 8, PAGE_W - MARGIN * 2, 54, fill=WHITE)
        c.setFillColor(ORANGE)
        c.roundRect(MARGIN + 12, top - 34, 105, 32, 9, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT, 8.8)
        c.drawCentredString(MARGIN + 64.5, top - 22, problem)
        draw_lines(c, answer, MARGIN + 132, top - 12, PAGE_W - MARGIN * 2 - 146, size=8.5, leading=13)

    y -= 340
    y = section_title(c, "安全に使うためのルール", MARGIN, y, PAGE_W - MARGIN * 2, accent=RED)
    card(c, MARGIN, y + 8, PAGE_W - MARGIN * 2, 108, fill=HexColor("#FFF5F3"), stroke=HexColor("#F4B8AD"))
    safety = [
        "公開URLとアクセスPINをSNS・掲示板・不特定多数のグループへ載せない",
        "PINはこの資料に書き込まず、スタッフへ口頭または別の安全な方法で伝える",
        "退職者が出た、またはPINが漏れた可能性がある場合はPINを変更する",
        "iPadを店舗外へ持ち出す場合や長時間離席する場合は「ロック」を押す",
    ]
    yy = y - 12
    for item in safety:
        c.setFillColor(RED)
        c.setFont(FONT, 9)
        c.drawString(MARGIN + 16, yy, "●")
        draw_lines(c, item, MARGIN + 34, yy, PAGE_W - MARGIN * 2 - 50, size=8.6, leading=13)
        yy -= 22

    y -= 134
    y = section_title(c, "導入前チェックリスト", MARGIN, y, PAGE_W - MARGIN * 2, accent=GREEN)
    checks = [
        "店長がアクセスPINを決め、スタッフへ共有した",
        "iPadのホーム画面へ追加した",
        "実際のスタッフ名を登録した",
        "開店前・締めの作業内容を最終確認した",
        "スタッフ全員が「作業中→完了」の操作を1回試した",
    ]
    col_width = (PAGE_W - MARGIN * 2 - 12) / 2
    for idx, item in enumerate(checks):
        col = idx % 2
        row = idx // 2
        xx = MARGIN + col * (col_width + 12)
        yy = y - row * 36
        c.setStrokeColor(BORDER)
        c.setFillColor(WHITE)
        c.roundRect(xx, yy - 27, col_width, 32, 8, fill=1, stroke=1)
        c.setStrokeColor(BLUE)
        c.rect(xx + 12, yy - 19, 11, 11, fill=0, stroke=1)
        draw_lines(c, item, xx + 31, yy - 9, col_width - 40, size=7.9, leading=11, max_lines=2)

    footer(c)
    c.showPage()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    c.setTitle("作業確認ボード 店長向け操作ガイド")
    c.setAuthor("作業確認ボード")
    page_one(c)
    page_two(c)
    page_three(c)
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
