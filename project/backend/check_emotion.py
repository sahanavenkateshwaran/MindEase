import numpy as np
from app.services.video_service import VideoService

service = VideoService()
img = np.zeros((240, 320, 3), dtype=np.uint8)
img[:, :, 0] = 180
img[:, :, 1] = 220
img[:, :, 2] = 255
print(service.get_heuristic_emotion(img))
