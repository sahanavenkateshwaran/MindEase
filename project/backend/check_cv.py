import cv2, os
print('cv2', cv2.__version__)
for name in ['haarcascade_frontalface_default.xml','haarcascade_smile.xml']:
    p = os.path.join(cv2.data.haarcascades, name)
    print(name, os.path.exists(p), p)
