
#!/usr/bin/env python3

import argparse
import re
import sys
from pathlib import Path
from io import BytesIO

from PIL import Image

try:
    from rembg import remove, new_session
except ImportError:
    print("Instale as dependencias com:")
    print('python -m pip install pillow "rembg[cpu]"')
    sys.exit(1)


# Faixas aproximadas das cartelas.
# Cada linha e dividida em celulas.

MOVEMENT_ROWS = [
    (0.000, 0.245, 9, "mindi", "idle"),
    (0.245, 0.475, 8, "mindi", "reactions"),
    (0.475, 0.600, 7, "pets/cat", "poses"),
    (0.600, 0.745, 7, "pets/dog", "poses"),
    (0.745, 0.875, 7, "pets/bunny", "poses"),
    (0.875, 1.000, 7, "pets/fox", "poses"),
]

EXPRESSION_ROWS = [
    (0.000, 0.245, 8, "mindi", "idle"),
    (0.245, 0.445, 8, "mindi", "reactions"),
    (0.445, 0.600, 8, "pets/cat", "poses"),
    (0.600, 0.745, 8, "pets/dog", "poses"),
    (0.745, 0.875, 8, "pets/bunny", "poses"),
    (0.875, 1.000, 8, "pets/fox", "poses"),
]


def trim_transparent(image, padding=8):
    image = image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()

    if bbox is None:
        return image

    left, top, right, bottom = bbox

    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)

    return image.crop((left, top, right, bottom))


def remove_background(image, session):
    result = remove(image, session=session)

    if isinstance(result, Image.Image):
        return result.convert("RGBA")

    return Image.open(BytesIO(result)).convert("RGBA")


def get_category(prefix, folder, row, col):
    if folder != "mindi":
        return "poses"

    if prefix == "movement":
        if row == 1:
            if col <= 4:
                return "idle"
            elif col <= 7:
                return "walking"
            return "running"

        if row == 2:
            if col == 8:
                return "sleeping"
            elif col == 7:
                return "idle"
            return "reactions"

    if prefix == "expressions":
        if row == 1 and col == 1:
            return "idle"

        if row == 2 and col == 7:
            return "sleeping"

        return "reactions"

    return "reactions"


def process_sheet(source, output_root, rows, prefix, session):
    source = Path(source)

    if not source.exists():
        raise FileNotFoundError(
            f"Imagem nao encontrada: {source}"
        )

    with Image.open(source) as original:
        sheet = original.convert("RGBA")

    total = 0

    for row_index, row_data in enumerate(rows, start=1):
        y0, y1, columns, folder, default_category = row_data

        top = round(y0 * sheet.height)
        bottom = round(y1 * sheet.height)

        row_height = bottom - top

        for col_index in range(columns):
            left = round(
                col_index * sheet.width / columns
            )

            right = round(
                (col_index + 1) * sheet.width / columns
            )

            margin_x = max(3, round(sheet.width * 0.004))
            margin_y = max(3, round(row_height * 0.025))

            box = (
                max(0, left - margin_x),
                max(0, top - margin_y),
                min(sheet.width, right + margin_x),
                min(sheet.height, bottom + margin_y),
            )

            crop = sheet.crop(box)

            print(
                f"Processando {prefix}: "
                f"linha {row_index}, coluna {col_index + 1}"
            )

            cutout = remove_background(crop, session)
            cutout = trim_transparent(cutout)

            if cutout.getchannel("A").getbbox() is None:
                print("Celula vazia ignorada.")
                continue

            category = get_category(
                prefix,
                folder,
                row_index,
                col_index + 1
            )

            destination = (
                output_root / folder / category
            )

            destination.mkdir(
                parents=True,
                exist_ok=True
            )

            filename = (
                f"{prefix}_r{row_index:02d}"
                f"_c{col_index + 1:02d}.png"
            )

            cutout.save(
                destination / filename,
                format="PNG",
                optimize=True
            )

            total += 1

    return total


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--movement", type=Path)
    parser.add_argument("--expressions", type=Path)

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/companions")
    )

    args = parser.parse_args()

    if not args.movement and not args.expressions:
        parser.error(
            "Informe --movement ou --expressions."
        )

    print("Carregando modelo de remocao de fundo...")
    print("Na primeira execucao pode demorar.")

    session = new_session("u2net")

    total = 0

    try:
        if args.movement:
            total += process_sheet(
                args.movement,
                args.output,
                MOVEMENT_ROWS,
                "movement",
                session
            )

        if args.expressions:
            total += process_sheet(
                args.expressions,
                args.output,
                EXPRESSION_ROWS,
                "expressions",
                session
            )

    except Exception as error:
        print(f"Erro: {error}")
        return 1

    print("\nProcessamento concluido!")
    print(f"Total de imagens: {total}")
    print(f"Pasta: {args.output.resolve()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
