// Default colors are parsed from MUSIC.txt base packets
export const MUSIC_STYLES = [
  {
    id: 'rhythm',
    name: 'Rhythm',
    styleId: 0x40,
    defaultColors: ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#00ffff','#8b00ff','#ff336b'],
    hasCalm: true,
    hasWindmill: false,
  },
  {
    id: 'windmill',
    name: 'Windmill',
    styleId: 0x41,
    defaultColors: ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#00ffff','#8b00ff'],
    hasCalm: false,
    hasWindmill: true,
  },
  {
    id: 'hooray',
    name: 'Hooray',
    styleId: 0x42,
    defaultColors: ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#00ffff','#8b00ff'],
    hasCalm: false,
    hasWindmill: false,
  },
  {
    id: 'sprouting',
    name: 'Sprouting',
    styleId: 0x43,
    defaultColors: ['#ff0000','#00ff00','#0000ff','#00ffff','#8b00ff','#fd9fb8','#ff3ee3'],
    hasCalm: false,
    hasWindmill: false,
  },
  {
    id: 'expansion',
    name: 'Expansion',
    styleId: 0x52,
    defaultColors: ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#00ffff','#8b00ff'],
    hasCalm: false,
    hasWindmill: false,
  },
  {
    id: 'torch',
    name: 'Torch',
    styleId: 0x50,
    defaultColors: ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#00ffff','#8b00ff'],
    hasCalm: false,
    hasWindmill: false,
  },
  {
    id: 'flowing',
    name: 'Flowing',
    styleId: 0x53,
    defaultColors: ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#00ffff','#8b00ff'],
    hasCalm: false,
    hasWindmill: false,
  },
  {
    id: 'hopping',
    name: 'Hopping',
    styleId: 0x48,
    defaultColors: ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#00ffff','#8b00ff','#0129ff'],
    hasCalm: false,
    hasWindmill: false,
  },
]

export function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function xor(bytes) {
  return bytes.reduce((a, b) => a ^ b, 0)
}

/**
 * Build the 3 BT packets for a music style.
 * @param {number} styleId    - 0x40, 0x41, etc.
 * @param {string[]} colors   - array of '#rrggbb', length 2-8
 * @param {boolean} heavyBass
 * @param {number} styleOption - 0=default, 1=calm(rhythm)/CCW(windmill), 2=CW(windmill)
 * @param {number} sensitivity - 0-100 (maps to 0x00-0x63 in mode packet byte 3)
 */
export function buildMusicPackets(styleId, colors, heavyBass, styleOption = 0, sensitivity = 100) {
  const count = Math.max(2, Math.min(8, colors.length))

  // Packet 1: color data 1-4
  const p1 = new Uint8Array(20)
  p1[0]=0xa3; p1[1]=0x00; p1[2]=0x01; p1[3]=0x02; p1[4]=0x41
  p1[5]=styleId; p1[6]=count
  for (let i = 0; i < Math.min(4, count); i++) {
    const [r,g,b] = hexToRgb(colors[i] || '#000000')
    p1[7+i*3]=r; p1[8+i*3]=g; p1[9+i*3]=b
  }
  p1[19] = xor(p1.slice(0, 19))

  // Packet 2: color data 5-8 + heavy bass flag at byte 14
  const p2 = new Uint8Array(20)
  p2[0]=0xa3; p2[1]=0xff
  for (let i = 4; i < Math.min(8, count); i++) {
    const [r,g,b] = hexToRgb(colors[i] || '#000000')
    p2[2+(i-4)*3]=r; p2[3+(i-4)*3]=g; p2[4+(i-4)*3]=b
  }
  p2[14] = heavyBass ? 1 : 0
  p2[19] = xor(p2.slice(0, 19))

  // Packet 3: mode packet — byte 3 = sensitivity (0x00–0x63)
  const sensByte = Math.round(Math.max(0, Math.min(100, sensitivity)) / 100 * 0x63)
  const p3 = new Uint8Array(20)
  p3[0]=0x33; p3[1]=0x05; p3[2]=0x13; p3[3]=sensByte
  p3[4]=styleId; p3[5]=styleOption; p3[6]=heavyBass ? 1 : 0
  p3[19] = xor(p3.slice(0, 19))

  return [p1, p2, p3]
}
