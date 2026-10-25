export const BANNER_PRESETS = [
  {
    id: 'preset:winter1',
    name: 'Gemütliche Winternacht',
    background: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%)',
    icon: '✨'
  },
  {
    id: 'preset:crimson',
    name: 'Festliches Rubinrot',
    background: 'linear-gradient(135deg, #4a0404 0%, #7f1d1d 50%, #991b1b 100%)',
    icon: '🎄'
  },
  {
    id: 'preset:emerald',
    name: 'Smaragdwald',
    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    icon: '🌲'
  },
  {
    id: 'preset:gold',
    name: 'Sternenglanz Gold',
    background: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)',
    icon: '⭐'
  },
  {
    id: 'preset:aurora',
    name: 'Nordlicht Polarnacht',
    background: 'linear-gradient(135deg, #090d16 0%, #0f3d3e 50%, #301e67 100%)',
    icon: '🌌'
  },
  {
    id: 'preset:candycane',
    name: 'Zuckerstange & Beeren',
    background: 'linear-gradient(135deg, #831843 0%, #9f1239 50%, #be123c 100%)',
    icon: '🍬'
  }
];

export const AVATAR_PRESETS = [
  { id: 'avatar:santa', label: 'Weihnachtsmann', emoji: '🎅' },
  { id: 'avatar:mrs_santa', label: 'Weihnachtsfrau', emoji: '🤶' },
  { id: 'avatar:elf', label: 'Wichtel-Elf', emoji: '🧝' },
  { id: 'avatar:reindeer', label: 'Rentier Rudolph', emoji: '🦌' },
  { id: 'avatar:snowman', label: 'Schneemann', emoji: '⛄' },
  { id: 'avatar:gingerbread', label: 'Lebkuchenmann', emoji: '🍪' },
  { id: 'avatar:tree', label: 'Tannenbaum', emoji: '🎄' },
  { id: 'avatar:gift', label: 'Überraschungspaket', emoji: '🎁' },
  { id: 'avatar:star', label: 'Weihnachtsstern', emoji: '⭐' },
  { id: 'avatar:penguin', label: 'Pinguin', emoji: '🐧' },
  { id: 'avatar:polarbear', label: 'Eisbär', emoji: '🐻‍❄️' },
  { id: 'avatar:fox', label: 'Winterfuchs', emoji: '🦊' },
  { id: 'avatar:owl', label: 'Schnee-Eule', emoji: '🦉' },
  { id: 'avatar:snowflake', label: 'Schneeflocke', emoji: '❄️' },
  { id: 'avatar:bell', label: 'Glöckchen', emoji: '🔔' },
  { id: 'avatar:candle', label: 'Adventskerze', emoji: '🕯️' }
];

export const BUDGET_PRESETS = ['10 €', '15 €', '20 €', '25 €', '30 €', '50 €'];

export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}
