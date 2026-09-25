// Ilustraciones de cada destino para la portada, mientras no haya foto del hotel cargada.
// Un paisaje reconocible por ciudad: Obelisco, costa atlántica, Nahuel Huapi y la arboleda de Palermo.

function Cielo({ id, arriba, abajo }: { id: string; arriba: string; abajo: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={arriba} />
          <stop offset="1" stopColor={abajo} />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill={`url(#${id})`} />
    </>
  )
}

function BuenosAires() {
  const edificios = [
    [0, 560, 90], [90, 500, 70], [160, 610, 110], [270, 450, 80], [350, 540, 100], [450, 480, 70], [520, 590, 90],
    [940, 520, 90], [1030, 430, 70], [1100, 560, 120], [1220, 470, 80], [1300, 540, 110], [1410, 500, 90], [1500, 580, 100],
  ]
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <Cielo id="c-ba" arriba="#141b2e" abajo="#c2553a" />
      <circle cx="1180" cy="690" r="140" fill="#f2a65a" opacity="0.55" />
      {edificios.map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={1000 - y} fill="#15151c" />
          {Array.from({ length: Math.floor((1000 - y - 60) / 46) }, (_, f) =>
            Array.from({ length: Math.floor(w / 26) }, (_, c) => ((f * 7 + c * 3 + i) % 4 === 0 ? (
              <rect key={`${f}-${c}`} x={x + 10 + c * 26} y={y + 24 + f * 46} width="10" height="16" fill="#f7c873" opacity="0.8" />
            ) : null)),
          )}
        </g>
      ))}
      {/* Obelisco */}
      <path d="M800 170 L826 240 L838 1000 L762 1000 L774 240 Z" fill="#1b1b22" />
      <path d="M800 170 L826 240 L774 240 Z" fill="#2a2a33" />
      <rect x="0" y="930" width="1600" height="70" fill="#0e0e12" />
    </svg>
  )
}

function MarDelPlata() {
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <Cielo id="c-mdq" arriba="#0f3b5f" abajo="#f0b27a" />
      <circle cx="400" cy="560" r="110" fill="#ffe0a8" opacity="0.9" />
      <rect x="0" y="600" width="1600" height="400" fill="#0d3b56" />
      {[640, 700, 770, 850].map((y, i) => (
        <path key={y} d={`M0 ${y} Q 100 ${y - 12} 200 ${y} T 400 ${y} T 600 ${y} T 800 ${y} T 1000 ${y} T 1200 ${y} T 1400 ${y} T 1600 ${y}`}
          fill="none" stroke="#ffffff" strokeOpacity={0.12 + i * 0.05} strokeWidth="4" />
      ))}
      <path d="M300 600 L520 600 L480 612 L340 612 Z" fill="#ffe0a8" opacity="0.35" />
      {/* costa con edificios */}
      <path d="M1000 600 L1000 470 L1060 470 L1060 420 L1130 420 L1130 490 L1190 490 L1190 380 L1260 380 L1260 460 L1330 460 L1330 410 L1420 410 L1420 480 L1500 480 L1500 440 L1600 440 L1600 1000 L1120 1000 Z"
        fill="#162230" />
      <path d="M940 1000 Q 1040 760 1180 640 L1600 610 L1600 1000 Z" fill="#c9a877" />
      {/* lobo marino */}
      <path d="M1250 640 q 30 -60 60 -40 q 10 10 0 40 q 20 10 30 30 l -100 0 z" fill="#3a3a3a" />
    </svg>
  )
}

function Bariloche() {
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <Cielo id="c-bcr" arriba="#1d3a5c" abajo="#9cc4dc" />
      <path d="M0 620 L260 300 L420 460 L640 180 L860 480 L1040 280 L1300 560 L1450 420 L1600 540 L1600 700 L0 700 Z" fill="#3b4f66" />
      <path d="M560 280 L640 180 L720 290 L680 270 L650 300 L610 265 Z M980 350 L1040 280 L1100 360 L1060 345 L1035 370 Z M200 375 L260 300 L320 380 L280 365 L255 390 Z"
        fill="#ffffff" />
      <path d="M0 700 L180 560 L380 690 L600 600 L820 700 L1060 610 L1300 700 L1600 620 L1600 720 L0 720 Z" fill="#23384d" />
      <rect x="0" y="720" width="1600" height="280" fill="#1a4e70" />
      {[760, 810, 880].map((y) => (
        <line key={y} x1={200 + (y % 7) * 40} y1={y} x2={1300 - (y % 5) * 60} y2={y} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="3" />
      ))}
      {/* coihues en primer plano */}
      {[60, 140, 1440, 1520].map((x, i) => (
        <path key={x} d={`M${x} 1000 L${x} ${820 - i * 10} M${x - 60} ${900} L${x} ${720 - i * 10} L${x + 60} 900 Z`} fill="#0f2419" stroke="#0f2419" strokeWidth="10" />
      ))}
    </svg>
  )
}

function Palermo() {
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
      <Cielo id="c-pal" arriba="#27163f" abajo="#e07a8a" />
      {[[120, 520, 260, 480], [420, 470, 200, 530], [660, 540, 300, 460], [1000, 490, 220, 510], [1260, 530, 340, 470]].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={1000 - y} fill={i % 2 ? '#2b1f36' : '#33243f'} />
          {Array.from({ length: 6 }, (_, f) => (
            <rect key={f} x={x + 20} y={y + 30 + f * 70} width={w - 40} height="8" fill="#1d1426" />
          ))}
        </g>
      ))}
      {/* jacarandás */}
      {[80, 380, 700, 1020, 1340].map((x, i) => (
        <g key={x}>
          <rect x={x + 90} y="760" width="16" height="240" fill="#2a1a1a" />
          <circle cx={x + 98} cy={730} r={110 - (i % 2) * 20} fill="#8e6bd6" opacity="0.9" />
          <circle cx={x + 40} cy={770} r="70" fill="#a887ea" opacity="0.85" />
          <circle cx={x + 160} cy={780} r="64" fill="#7a58c4" opacity="0.9" />
        </g>
      ))}
      <rect x="0" y="960" width="1600" height="40" fill="#140d1c" />
    </svg>
  )
}

const ESCENAS: Record<string, () => React.JSX.Element> = {
  marriott: BuenosAires,
  'sheraton-mdq': MarDelPlata,
  'sheraton-bcr': Bariloche,
  'city-express': Palermo,
}

export default function EscenaHotel({ id }: { id: string }) {
  const Escena = ESCENAS[id] ?? BuenosAires
  return <Escena />
}
