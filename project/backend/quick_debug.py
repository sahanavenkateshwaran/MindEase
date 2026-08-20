import cv2
import numpy as np
from app.services.video_service import VideoService


def make_smile_face():
    img = np.full((240, 320, 3), 220, dtype=np.uint8)
    cv2.ellipse(img, (160, 120), (80, 90), 0, 0, 360, (220, 200, 180), -1)
    cv2.ellipse(img, (130, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (190, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (160, 150), (42, 18), 0, 0, 180, (60, 60, 60), -1)
    return img


def make_sad_face():
    img = np.full((240, 320, 3), 180, dtype=np.uint8)
    cv2.ellipse(img, (160, 120), (80, 90), 0, 0, 360, (200, 180, 170), -1)
    cv2.ellipse(img, (130, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (190, 112), (18, 24), 0, 0, 360, (80, 80, 80), -1)
    cv2.ellipse(img, (160, 170), (42, 22), 0, 180, 360, (70, 70, 70), -1)
    return img

svc = VideoService()
for name, img in [('smile', make_smile_face()), ('sad', make_sad_face())]:
    crop, _ = svc._face_crop(img)
    if crop is None:
        crop = img
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    mouth = gray[int(h*0.55):, int(w*0.15):int(w*0.85)]
    mid = mouth.shape[0] // 2
    upper = mouth[:mid]
    lower = mouth[mid:]
    print(name)
    print('mouth_mean', float(np.mean(mouth)))
    print('upper_mean', float(np.mean(upper)))
    print('lower_mean', float(np.mean(lower)))
    print('upper_dark_ratio', float(np.mean(upper < (float(np.mean(mouth)) - 25))))
    print('lower_dark_ratio', float(np.mean(lower < (float(np.mean(mouth)) - 25))))
    print('classify_mouth_shape', svc._classify_mouth_shape(crop))
    print('detect', svc.detect_emotion_from_image(img))
    print('---')
