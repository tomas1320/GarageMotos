// ============================================================
//  GARAGE MOTOS — Datos del negocio y catálogo
//  Precios de referencia de mercado (ARS, nov. 2026). Editá libremente.
// ============================================================

export const BUSINESS = {
  name: 'Garage Motos',
  tagline: 'Concesionaria de motos',
  city: 'Deán Funes, Córdoba',
  phoneDisplay: '3521 44-3837',
  whatsapp: '5493521443837',
  whatsappShort: 'https://w.app/garagemotos',
  instagram: 'https://www.instagram.com/garagemotos.cde/',
  instagramUser: '@garagemotos.cde',
  branches: [
    { name: 'Casa central', address: 'Sáenz Peña 214', city: 'Deán Funes, Córdoba' },
    { name: 'Sucursal', address: 'Eva Perón 163', city: 'Deán Funes, Córdoba' },
  ],
  reserve: {
    minPct: 10,       // seña mínima (%)
    maxPct: 50,
    holdHours: 72,    // horas que se mantiene la reserva
  },
};

// Planes orientativos de financiación (TNA de referencia, sistema francés)
export const PLANS = [
  { n: 3, tna: 0, label: '3 cuotas sin interés' },
  { n: 6, tna: 0.35 },
  { n: 12, tna: 0.45 },
  { n: 18, tna: 0.5 },
  { n: 24, tna: 0.55 },
];

export function cuota(capital, n, tna) {
  if (!tna) return capital / n;
  const i = tna / 12;
  return (capital * i) / (1 - Math.pow(1 + i, -n));
}

export const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'cub', label: 'Urbanas' },
  { id: 'street', label: 'Calle' },
  { id: 'enduro', label: 'Enduro' },
  { id: 'naked', label: 'Naked' },
  { id: 'adventure', label: 'Adventure' },
];

const I = (f) => `img/motos/${f}.webp`;

export const MOTOS = [
  {
    id: 'honda-wave-110',
    brand: 'Honda', model: 'Wave 110 S', cat: 'cub', cc: 110,
    price: 3450000, badge: 'Más vendida',
    colors: [{ name: 'Rojo', hex: '#d3141c', img: I('honda-wave') }],
    specs: { Motor: '109 cc · 4T · monocilíndrico', Potencia: '8,3 HP', Transmisión: '4 vel. semiautomática', Frenos: 'Tambor / tambor', Tanque: '3,7 L', Consumo: '≈ 60 km/L' },
    desc: 'La moto que nunca falla. Economía, confiabilidad Honda y el mejor valor de reventa para moverte todos los días.',
  },
  {
    id: 'siam-qu-110',
    brand: 'Siam', model: 'Qu 110', cat: 'cub', cc: 110,
    price: 2150000,
    colors: [{ name: 'Verde', hex: '#13684a', img: I('siam-qu') }],
    specs: { Motor: '107 cc · 4T', Potencia: '7 HP', Transmisión: '4 vel. semiautomática', Frenos: 'Disco / tambor', Tanque: '4 L', Llantas: 'Aleación' },
    desc: 'Clásica, liviana y con freno a disco delantero. Ideal para la ciudad y para quien arranca en dos ruedas.',
  },
  {
    id: 'zanella-rx-150',
    brand: 'Zanella', model: 'RX 150 Z7', cat: 'street', cc: 150,
    price: 1990000, badge: 'Mejor precio',
    colors: [{ name: 'Rojo', hex: '#e3201b', img: I('zanella-rx150') }],
    specs: { Motor: '149 cc · 4T', Potencia: '11 HP', Transmisión: '5 velocidades', Frenos: 'Tambor / tambor', Tanque: '12 L', Arranque: 'Eléctrico y patada' },
    desc: 'La street más accesible del salón. Robusta, simple de mantener y con portaequipaje de serie.',
  },
  {
    id: 'motomel-s2-150',
    brand: 'Motomel', model: 'S2 150', cat: 'street', cc: 150,
    price: 2050000,
    colors: [
      { name: 'Gris', hex: '#a9adb3', img: I('motomel-s2-gris') },
      { name: 'Azul', hex: '#1240b8', img: I('motomel-s2-azul') },
    ],
    specs: { Motor: '149 cc · 4T', Potencia: '11,5 HP', Transmisión: '5 velocidades', Frenos: 'Disco / tambor', Tanque: '13 L', Arranque: 'Eléctrico y patada' },
    desc: 'Una de las 150 más elegidas de Argentina. Cómoda, gastadora mínima y con repuestos en todos lados.',
  },
  {
    id: 'gilera-vc-150',
    brand: 'Gilera', model: 'VC 150 Full', cat: 'street', cc: 150,
    price: 2190000,
    colors: [{ name: 'Blanco', hex: '#e9e9ea', img: I('gilera-vc150') }],
    specs: { Motor: '149 cc · 4T', Potencia: '11,5 HP', Transmisión: '5 velocidades', Frenos: 'Disco / disco', Tanque: '13 L', Tablero: 'Digital' },
    desc: 'Diseño moderno, doble disco y tablero digital. Una street completa a precio de entrada.',
  },
  {
    id: 'honda-cb-125f',
    brand: 'Honda', model: 'CB 125F', cat: 'street', cc: 125,
    price: 3890000,
    colors: [{ name: 'Negro / Azul', hex: '#14161c', accent: '#1f5bd6', img: I('honda-cb125f') }],
    specs: { Motor: '124 cc · 4T · inyección', Potencia: '10,7 HP', Transmisión: '5 velocidades', Frenos: 'Disco / tambor', Tanque: '10,3 L', Consumo: '≈ 50 km/L' },
    desc: 'Inyección electrónica, terminación Honda y un consumo que no se siente. La street premium para el día a día.',
  },
  {
    id: 'motomel-skua-150',
    brand: 'Motomel', model: 'Skua 150', cat: 'enduro', cc: 150,
    price: 2499000, badge: 'Top ventas',
    colors: [
      { name: 'Rojo', hex: '#e01b1b', img: I('skua150-rojo') },
      { name: 'Azul', hex: '#1d34b8', img: I('skua150-azul') },
    ],
    specs: { Motor: '149 cc · 4T', Potencia: '12 HP', Transmisión: '5 velocidades', Frenos: 'Disco / tambor', Tanque: '12 L', Suspensión: 'Monoamortiguador' },
    desc: 'La enduro que se anima a todo: ciudad, ripio y camino de tierra. Alta, cómoda y con look aventurero.',
  },
  {
    id: 'corven-triax-150',
    brand: 'Corven', model: 'Triax 150', cat: 'enduro', cc: 150,
    price: 2790000,
    colors: [{ name: 'Blanco', hex: '#f2f2f2', accent: '#d31b1b', img: I('corven-triax150') }],
    specs: { Motor: '149 cc · 4T', Potencia: '12 HP', Transmisión: '5 velocidades', Frenos: 'Disco / tambor', Tanque: '10 L', Rodado: '21" / 18"' },
    desc: 'Rodado 21 adelante, suspensiones de recorrido largo y una ergonomía pensada para el campo y la ruta.',
  },
  {
    id: 'skua-250-adv',
    brand: 'Motomel', model: 'Skua 250 ADV', cat: 'adventure', cc: 250,
    price: 4390000, badge: 'Nueva',
    colors: [{ name: 'Gris', hex: '#8d9097', accent: '#2fb7e0', img: I('skua250-adv') }],
    specs: { Motor: '249 cc · 4T', Potencia: '19 HP', Transmisión: '5 velocidades', Frenos: 'Disco / disco', Tanque: '15 L', Parabrisas: 'Rally' },
    desc: 'Estética rally, parabrisas alto y motor 250 para viajar. Lista para salir a las Sierras de Córdoba.',
  },
  {
    id: 'corven-triax-250-touring',
    brand: 'Corven', model: 'Triax 250 Touring', cat: 'adventure', cc: 250,
    price: 4790000,
    colors: [{ name: 'Negro', hex: '#1a1b1d', accent: '#9bd31f', img: I('triax250-touring') }],
    specs: { Motor: '249 cc · 4T', Potencia: '18 HP', Transmisión: '5 velocidades', Frenos: 'Disco / disco', Tanque: '16 L', Equipamiento: 'Baúl + cubrepuños' },
    desc: 'Viene equipada para viajar: baúl trasero, cubrepuños y parabrisas. Kilómetros sin límites.',
  },
  {
    id: 'tx-250-gs',
    brand: 'GK', model: 'TX 250 GS', cat: 'adventure', cc: 250,
    price: 4990000,
    colors: [{ name: 'Azul / Rojo', hex: '#1b45c4', accent: '#e31b2a', img: I('tx250gs') }],
    specs: { Motor: '250 cc · 4T', Potencia: '20 HP', Transmisión: '6 velocidades', Frenos: 'Disco / disco', Tanque: '17 L', Suspensión: 'Invertida dorada' },
    desc: 'Horquilla invertida, llantas de aleación y protecciones. Look GS con precio para todos.',
  },
  {
    id: 'bajaj-dominar-250',
    brand: 'Bajaj', model: 'Dominar 250', cat: 'naked', cc: 250,
    price: 5650000, badge: 'Destacada',
    colors: [
      { name: 'Blanco', hex: '#e8e8ea', accent: '#1d1d1f', img: I('dominar250-blanca') },
      { name: 'Rojo', hex: '#d1121f', img: I('dominar250-roja') },
    ],
    specs: { Motor: '248,8 cc · DOHC · refrigeración líquida', Potencia: '27 HP', Transmisión: '6 velocidades', Frenos: 'Disco / disco · ABS', Tanque: '13 L', Iluminación: 'Full LED' },
    desc: 'Refrigeración líquida, ABS doble canal y full LED. La naked con mejor relación precio / prestaciones.',
  },
  {
    id: 'italika-250z',
    brand: 'Italika', model: '250Z', cat: 'naked', cc: 250,
    price: 4250000,
    colors: [{ name: 'Negro', hex: '#151618', accent: '#c41d25', img: I('italika-250z') }],
    specs: { Motor: '223 cc · 4T', Potencia: '17 HP', Transmisión: '5 velocidades', Frenos: 'Disco / disco', Tanque: '14 L', Tablero: 'Digital' },
    desc: 'Agresiva, con tablero digital y doble disco. Estilo naked a un precio que sorprende.',
  },
  {
    id: 'cfmoto-250nk',
    brand: 'CFMoto', model: '250 NK', cat: 'naked', cc: 250,
    price: 6900000,
    colors: [{ name: 'Celeste', hex: '#1d9fd8', accent: '#18191b', img: I('cfmoto-250nk') }],
    specs: { Motor: '249 cc · DOHC · refrigeración líquida', Potencia: '26,5 HP', Transmisión: '6 velocidades', Frenos: 'Disco / disco · ABS', Tanque: '12,5 L', Tablero: 'TFT' },
    desc: 'Tecnología de primer nivel: tablero TFT, ABS y un motor DOHC que gira alto. Diseño europeo.',
  },
  {
    id: 'ktm-duke-250',
    brand: 'KTM', model: '250 Duke', cat: 'naked', cc: 250,
    price: 9800000, badge: 'Premium',
    colors: [{ name: 'Naranja / Negro', hex: '#1b1c1e', accent: '#ff6a00', frame: '#ff6a00', img: I('ktm-duke250') }],
    specs: { Motor: '249 cc · DOHC · refrigeración líquida', Potencia: '30 HP', Transmisión: '6 velocidades · quickshifter', Frenos: 'Disco / disco · ABS', Tanque: '15 L', Chasis: 'Multitubular trellis' },
    desc: 'Ready to race. Chasis trellis, suspensión WP y la electrónica de KTM. La 250 más deportiva del salón.',
  },
];

export const FEATURED = ['ktm-duke-250', 'bajaj-dominar-250', 'skua-250-adv', 'honda-wave-110'];

export const fmt = (n) => '$' + Math.round(n).toLocaleString('es-AR');
export const findMoto = (id) => MOTOS.find((m) => m.id === id);
