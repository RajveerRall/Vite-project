from typing import Optional, Tuple, Dict, List
from PIL import Image, ImageDraw, ImageFont


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def draw_highlight_box(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, x: int, y: int):
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    padding = 6
    box = [x - padding, y - padding, x + text_width + padding, y + text_height + padding]
    draw.rectangle(box, fill='#FFE066', outline=None)


def draw_chapter_info(draw: ImageDraw.ImageDraw, fonts: Dict[str, ImageFont.FreeTypeFont],
                      book_title: str, chapter_title: str, author: str,
                      width: int, height: int, padding: int):
    chapter_bbox = fonts['title'].getbbox(chapter_title)
    chapter_width = chapter_bbox[2] - chapter_bbox[0]
    chapter_x = (width - chapter_width) // 2
    chapter_y = padding // 2
    draw.text((chapter_x, chapter_y), chapter_title, font=fonts['title'], fill='#333')


def calculate_split_geometry(width: int, height: int, image_side: str = "left") -> Dict[str, int]:
    # Equal 50/50 split; center divider
    image_w = width // 2
    text_w = width - image_w
    if image_side == "left":
        return {"image_w": image_w, "text_w": text_w, "image_x": 0, "text_x": image_w}
    else:
        return {"image_w": image_w, "text_w": text_w, "image_x": width - image_w, "text_x": 0}


def create_split_scroll_frame(
    layout: Dict,
    scroll_y: float,
    current_time: float,
    srt_entries: List[Dict],
    book_title: str,
    chapter_title: str,
    author: str,
    width: int,
    height: int,
    highlight_mode: str,
    srt_to_sentence_map: Optional[Dict[int, int]] = None,
    last_highlighted_sentence_id: Optional[int] = None,
    scene_timings: Optional[List[Dict]] = None,
    image_side: str = "left"
) -> Tuple[Image.Image, Optional[int]]:
    geo = calculate_split_geometry(width, height, image_side)
    image_w, text_w = geo["image_w"], geo["text_w"]
    image_x, text_x = geo["image_x"], geo["text_x"]

    # Base canvas
    img = Image.new('RGB', (width, height), color='#f8f9fa')

    # Scene image column – centered crop to fill (expect preprocessed to image_w x height)
    column_img = None
    if scene_timings:
        for scene in scene_timings:
            if scene['start_time'] <= current_time < scene['end_time']:
                src = scene.get('preprocessed_image')
                if src is not None:
                    if src.size != (image_w, height):
                        src = src.resize((image_w, height), Image.Resampling.LANCZOS)
                    column_img = src
                break
    if column_img is None:
        column_img = Image.new('RGB', (image_w, height), '#111111')
    else:
        # Cover-fit the image to fill the column without letterboxing (center-crop)
        src_w, src_h = column_img.size
        if src_w <= 0 or src_h <= 0:
            column_img = Image.new('RGB', (image_w, height), '#111111')
        else:
            scale = max(image_w / src_w, height / src_h)
            new_w = int(src_w * scale)
            new_h = int(src_h * scale)
            resized = column_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            left = max((new_w - image_w) // 2, 0)
            top = max((new_h - height) // 2, 0)
            column_img = resized.crop((left, top, left + image_w, top + height))
    img.paste(column_img, (image_x, 0))

    draw = ImageDraw.Draw(img)

    # Text column background (solid), same color as text area
    text_bg_color = '#F0F0E3'
    draw.rectangle([(text_x, 0), (text_x + text_w, height)], fill=text_bg_color)

    # Separator (center divider)
    sep_x = image_x + (image_w if image_side == "left" else 0)
    draw.line([(sep_x, 0), (sep_x, height)], fill='#e0e0e0', width=2)

    # Minimal text column: no overlay box, only chapter title + text
    pad = 24
    title_top = pad
    text_padding_x = text_x + pad  # consistent inner padding
    title_y = title_top

    # Draw chapter title at top-left of text column
    draw.text((text_padding_x, title_y), chapter_title, font=layout['fonts']['title'], fill='#333333')

    # Text starts below the chapter title
    text_start_y = title_y + layout['fonts']['title_size'] + 16
    container_top = title_top
    container_bottom = height

    current_highlighted_sentence_id = last_highlighted_sentence_id

    for line_idx, line_data in enumerate(layout['lines']):
        line_y = line_data['y'] - scroll_y + text_start_y
        if container_top <= line_y <= container_bottom:
            # Only draw highlight when mode requests it
            if highlight_mode == 'sentence' and srt_entries:
                is_current = False
                if srt_to_sentence_map:
                    active_idx = -1
                    for i, entry in enumerate(srt_entries):
                        if entry['start'] <= current_time < entry['end']:
                            active_idx = i
                            break
                    mapped = srt_to_sentence_map.get(active_idx) if active_idx >= 0 else None
                    is_current = (mapped == line_idx)
                if is_current:
                    draw_highlight_box(draw, line_data['text'], layout['fonts']['body'], text_padding_x, line_y)

            draw.text((text_padding_x, line_y), line_data['text'], font=layout['fonts']['body'], fill='#1a1a1a')

    return img, current_highlighted_sentence_id


