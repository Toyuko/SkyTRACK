from PIL import Image, ImageDraw
img = Image.new('RGB', (32, 32), color=(59, 130, 246))
draw = ImageDraw.Draw(img)
draw.rectangle([4, 4, 28, 28], fill=(30, 58, 138), outline=(147, 197, 253), width=2)
img.save('icon.png')
print('Icon created')
