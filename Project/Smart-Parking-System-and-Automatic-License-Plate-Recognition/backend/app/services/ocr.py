from io import BytesIO


def read_plate(image_bytes: bytes) -> dict:
    try:
        import cv2
        import easyocr
        import numpy as np
    except ImportError as exc:
        return {'plate': '', 'confidence': 0, 'source': 'ocr', 'error': f'OCR dependencies unavailable: {exc.name}'}

    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return {'plate': '', 'confidence': 0, 'source': 'ocr', 'error': 'Invalid image data.'}
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    results = reader.readtext(image, detail=1, paragraph=False)
    if not results:
        return {'plate': '', 'confidence': 0, 'source': 'ocr', 'error': 'No plate text detected.'}
    text = max(results, key=lambda item: item[2])
    plate = ''.join(char for char in text[1].upper() if char.isalnum() or char in '-.')
    return {'plate': plate, 'confidence': float(text[2]), 'source': 'ocr'}
