# Cómo sacar las fotos 360° de una moto

Con el celular alcanza. Por cada moto (y por cada color que quieras mostrar) necesitás **24 a 36 fotos** dando una vuelta completa, o **un video** dando la vuelta.

## Preparar el lugar
- Elegí una pared o fondo **liso y claro** (blanco o gris). Si podés, que el piso también sea liso.
- Mucha luz pareja: de día cerca de la vidriera, o con las luces del salón prendidas. Evitá el sol directo que hace sombras fuertes.
- Moto limpia, derecha (con el caballete lateral está bien), manubrio recto.
- Sacá del cuadro todo lo que no sea la moto (otras motos, carteles, cajas).

## Opción A: fotos (queda mejor)
1. Marcá en el piso con cinta un círculo alrededor de la moto, a unos **2,5 metros** de distancia.
2. Poné **36 marcas** en el círculo (una cada 10°). Un truco: 36 pasos cortos iguales.
3. Celular **horizontal**, a la **altura del tanque**, siempre apuntando al centro de la moto. **No uses zoom**, y no lo cambies entre fotos.
4. Arrancá de **costado** (con el frente de la moto hacia la derecha) y andá girando **siempre para el mismo lado**, una foto en cada marca.
5. Pasá las fotos a una carpeta en la compu. No les cambies el nombre (así quedan en orden).

## Opción B: video (más rápido)
1. Mismo lugar y misma distancia.
2. Grabá en **horizontal**, caminando **despacio y parejo** alrededor de la moto, dando **una vuelta completa** y terminando donde empezaste.
3. Que dure entre **20 y 40 segundos**. Si tenés un estabilizador o un palo de selfie, mejor.

## Convertirlas para la web
En la carpeta `garage-motos`:

```powershell
python herramientas/preparar_360.py "C:/ruta/a/la/carpeta-o-video" skua150-rojo
```

El script deja las imágenes en `img/360/skua150-rojo/` y te muestra la línea que tenés que pegar en `js/data.js`, dentro del color de esa moto. Por ejemplo:

```js
{ name: 'Rojo', hex: '#e01b1b', img: I('skua150-rojo'), spin: { dir: 'img/360/skua150-rojo/', frames: 36 } },
```

Listo: en la ficha de esa moto aparece la pestaña **"360° real"** y el botón de la tarjeta dice **"360° real"**.

Si al arrastrar la moto gira para el lado contrario, volvé a correr el script agregando `--invertir` al final.
