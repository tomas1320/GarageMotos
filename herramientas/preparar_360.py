"""
GARAGE MOTOS — Preparar un 360° con fotos reales
================================================

Convierte las fotos (o un video) que sacaste alrededor de una moto en la
secuencia de imágenes que usa la web.

USO (desde la carpeta garage-motos):

    python herramientas/preparar_360.py  <fotos-o-video>  <nombre>

    <fotos-o-video>  una carpeta con las fotos, o un video .mp4/.mov
    <nombre>         nombre corto para la carpeta, por ejemplo: skua150-rojo

Opciones:
    --fotos 36       cuántas imágenes usar (por defecto 36 = una cada 10°)
    --ancho 1200     ancho máximo de cada imagen en píxeles
    --invertir       si al arrastrar la moto gira para el lado contrario

Ejemplos:
    python herramientas/preparar_360.py "C:/Users/User/Desktop/fotos skua" skua150-rojo
    python herramientas/preparar_360.py "C:/Users/User/Desktop/skua.mp4" skua150-rojo --fotos 48

Requisitos (una sola vez):
    pip install pillow
    pip install opencv-python-headless   (solo si usás un video)
    pip install pillow-heif              (solo si las fotos son .HEIC de iPhone)
"""
import argparse
import os
import sys

from PIL import Image, ImageOps

EXT_FOTOS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'}
EXT_VIDEO = {'.mp4', '.mov', '.m4v', '.avi', '.mkv'}
SITIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def abrir_foto(ruta):
    if ruta.lower().endswith(('.heic', '.heif')):
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except ImportError:
            sys.exit('Las fotos son HEIC. Instalá el soporte con:  pip install pillow-heif')
    im = Image.open(ruta)
    return ImageOps.exif_transpose(im).convert('RGB')


def elegir(total, n):
    """Índices repartidos en forma pareja (sin repetir la primera al final)."""
    if total <= n:
        return list(range(total))
    return [round(i * total / n) for i in range(n)]


def desde_carpeta(carpeta, n):
    archivos = sorted(
        f for f in os.listdir(carpeta)
        if os.path.splitext(f)[1].lower() in EXT_FOTOS
    )
    if len(archivos) < 8:
        sys.exit(f'Encontré {len(archivos)} fotos en la carpeta. Para un 360° se necesitan al menos 8 (ideal 24 a 36).')
    print(f'Encontré {len(archivos)} fotos; uso {min(n, len(archivos))}.')
    return [abrir_foto(os.path.join(carpeta, archivos[i])) for i in elegir(len(archivos), n)]


def desde_video(video, n):
    try:
        import cv2
    except ImportError:
        sys.exit('Para usar un video instalá:  pip install opencv-python-headless')
    cap = cv2.VideoCapture(video)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total < n:
        sys.exit('El video es muy corto para sacar las fotos.')
    print(f'El video tiene {total} cuadros; saco {n} repartidos en todo el recorrido.')
    out = []
    for i in elegir(total, n):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, frame = cap.read()
        if not ok:
            continue
        out.append(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
    return out


def main():
    ap = argparse.ArgumentParser(description='Prepara un 360° con fotos reales para la web de Garage Motos')
    ap.add_argument('origen')
    ap.add_argument('nombre')
    ap.add_argument('--fotos', type=int, default=36)
    ap.add_argument('--ancho', type=int, default=1200)
    ap.add_argument('--invertir', action='store_true')
    a = ap.parse_args()

    nombre = a.nombre.strip().lower().replace(' ', '-')
    if not nombre.replace('-', '').isalnum():
        sys.exit('El nombre solo puede tener letras, números y guiones. Ej: skua150-rojo')

    if os.path.isdir(a.origen):
        imgs = desde_carpeta(a.origen, a.fotos)
    elif os.path.splitext(a.origen)[1].lower() in EXT_VIDEO:
        imgs = desde_video(a.origen, a.fotos)
    else:
        sys.exit('No encontré la carpeta o el video. Revisá la ruta (si tiene espacios, ponela entre comillas).')

    if a.invertir:
        imgs = [imgs[0]] + imgs[1:][::-1]

    # Mismo tamaño para todas (toma la primera como referencia)
    w0, h0 = imgs[0].size
    escala = min(1, a.ancho / w0)
    tam = (round(w0 * escala), round(h0 * escala))

    destino = os.path.join(SITIO, 'img', '360', nombre)
    os.makedirs(destino, exist_ok=True)
    for f in os.listdir(destino):
        if f.endswith('.webp'):
            os.remove(os.path.join(destino, f))
    for i, im in enumerate(imgs, 1):
        im = ImageOps.fit(im, tam, Image.LANCZOS) if im.size != (w0, h0) else im.resize(tam, Image.LANCZOS)
        im.save(os.path.join(destino, f'{i:02d}.webp'), 'WEBP', quality=82, method=6)

    peso = sum(os.path.getsize(os.path.join(destino, f)) for f in os.listdir(destino)) / 1e6
    print(f'\nListo: {len(imgs)} imágenes en img/360/{nombre}/  ({peso:.1f} MB en total)')
    print('\nAhora abrí js/data.js y, dentro del color de esa moto, agregá esta línea:\n')
    print(f"      spin: {{ dir: 'img/360/{nombre}/', frames: {len(imgs)} }},\n")
    print("Ejemplo:")
    print(f"  {{ name: 'Rojo', hex: '#e01b1b', img: I('skua150-rojo'), spin: {{ dir: 'img/360/{nombre}/', frames: {len(imgs)} }} }},")


if __name__ == '__main__':
    main()
