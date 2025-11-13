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
    image_ratio = 0.40 if width >= height else 0.45
    image_w = int(width * image_ratio)
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
    img.paste(column_img, (image_x, 0))

    # Separator
    sep_x = image_x + (image_w if image_side == "left" else 0)
    draw = ImageDraw.Draw(img)
    draw.line([(sep_x, 0), (sep_x, height)], fill='#e0e0e0', width=2)

    # Text container inside text column
    container_padding = int(text_w * 0.08)
    margin_top = int(height * 0.18)
    margin_bottom = int(height * 0.08)
    container_width = text_w - (2 * container_padding)
    container_height = height - margin_top - margin_bottom
    container_x = text_x + container_padding
    container_y = margin_top

    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    corner_radius = int(text_w * 0.02)
    container_color = (*hex_to_rgb('#F0F0E3'), int(255 * 0.65))
    overlay_draw.rounded_rectangle(
        [(container_x, container_y), (container_x + container_width, container_y + container_height)],
        radius=corner_radius,
        fill=container_color
    )
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    container_top = margin_top
    container_bottom = height - margin_bottom
    text_start_y = margin_top + layout['padding']
    text_padding_x = container_x + layout['padding']

    current_highlighted_sentence_id = last_highlighted_sentence_id

    for line_idx, line_data in enumerate(layout['lines']):
        line_y = line_data['y'] - scroll_y + text_start_y
        if container_top <= line_y <= container_bottom:
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

    draw_chapter_info(draw, layout['fonts'], book_title, chapter_title, author, width, height, layout['padding'])
    return img, current_highlighted_sentence_id


