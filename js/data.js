// Ravunix - static game data: map, difficulty, items, story
export const CELL = 2, WALL_H = 3.2, LEVEL_H = 3.6, W = 28, H = 16, FLOORS = 5;
export const FLOOR_NAMES = ['Basement', 'Ground Floor (Mess Hall)', 'Pehli Manzil', 'Doosri Manzil', 'Chhat'];

export const DIFF = {
  peaceful:  { label: 'Peaceful',  icon: '🕊️', ghost: false, speed: 0,   hear: 0,  stun: 0,  cd: 0,  batt: 8, keys: 3, drain: 0,   lights: true,  oneLife: false,
               info: 'Bhoot nahi hai. Hostel ki saari lights on. Aaram se ghoomo aur kahani padho.' },
  easy:      { label: 'Easy',      icon: '😊', ghost: true,  speed: 2.3, hear: .6, stun: 60, cd: 5,  batt: 9, keys: 3, drain: .7,  lights: false, oneLife: false,
               info: 'Bhoot dheema hai aur kam sunta hai. Lathi se 60 sec ke liye gira sakte ho.' },
  normal:    { label: 'Normal',    icon: '🙂', ghost: true,  speed: 3.0, hear: 1,  stun: 40, cd: 10, batt: 7, keys: 3, drain: 1.1, lights: false, oneLife: false,
               info: 'Balanced darr. 40 sec stun, 10 sec cooldown.' },
  hard:      { label: 'Hard',      icon: '😰', ghost: true,  speed: 3.7, hear: 1.4,stun: 25, cd: 20, batt: 6, keys: 4, drain: 1.6, lights: false, oneLife: false,
               info: 'Tez bhoot, 4 chaabiyan, torch jaldi khatam. Stun sirf 25 sec.' },
  extreme:   { label: 'Extreme',   icon: '💀', ghost: true,  speed: 4.4, hear: 2,  stun: 15, cd: 40, batt: 5, keys: 5, drain: 2.2, lights: false, oneLife: false,
               info: '5 chaabiyan, bahut tez bhoot jo zara si awaaz sun leta hai. Stun 15 sec, cooldown 40 sec.' },
  impossible:{ label: 'Impossible',icon: '☠️', ghost: true,  speed: 4.8, hear: 99, stun: 0,  cd: 0,  batt: 4, keys: 6, drain: 3.5, lights: false, oneLife: true, omni: true,
               info: 'Bhoot hamesha tumhari taraf aata hai aur use gira nahi sakte. 6 chaabiyan. Sirf EK jaan.' },
};
export const DIFF_ORDER = ['peaceful', 'easy', 'normal', 'hard', 'extreme', 'impossible'];

export const ITEMS = {
  torch:   { name: 'Torch',          icon: '🔦', stack: 1 },
  lathi:   { name: 'Lathi',          icon: '🏏', stack: 1 },
  battery: { name: 'Battery',        icon: '🔋', stack: 8 },
  planks:  { name: 'Lakdi ke takhte',icon: '🪵', stack: 8 },
  bottle:  { name: 'Kaanch ki botal', icon: '🍾', stack: 4 },
  key:     { name: 'Chaabi',         icon: '🔑', stack: 9, quest: true },
  fuse:    { name: 'Fuse',           icon: '🧯', stack: 1, quest: true },
  diary:   { name: 'Diary ka panna', icon: '📄', stack: 9, quest: true },
};

// chars: # wall, . floor, D door, g basement locked door, R roof locked door,
// U stairs up, N stairs down, S player spawn, o ghost spawn, G generator,
// b furniture(bed/table/ac), A almaari (hide), v tv, t stall, T tank, B boiler,
// X gate bars, P pipe (escape), q low parapet
export const SOLID_P = new Set(['#', 'q', 'b', 'A', 'v', 't', 'T', 'B', 'G', 'P', 'X']);
export const OPAQUE = new Set(['#', 'T', 'B', 'X', 'A']);

function makeGrid(fill) { return Array.from({ length: H }, () => Array(W).fill(fill)); }
function carve(g, x0, y0, x1, y1, ch = '.') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; }
const ROOMX = [[1, 5], [7, 11], [13, 17], [19, 23], [25, 26]];

function baseFloor() {
  const g = makeGrid('#'); carve(g, 1, 7, 26, 8);
  const rooms = [];
  for (const [a, b] of ROOMX) {
    const mid = (a + b) >> 1;
    carve(g, a, 1, b, 5); carve(g, a, 10, b, 14);
    g[6][mid] = 'D'; g[9][mid] = 'D';
    rooms.push({ x0: a, y0: 1, x1: b, y1: 5, door: [mid, 6], north: true });
    rooms.push({ x0: a, y0: 10, x1: b, y1: 14, door: [mid, 9], north: false });
  }
  return { g, rooms };
}
function dorm(g, r) {
  const by = r.north ? r.y0 : r.y1, ay = r.north ? r.y0 + 2 : r.y1 - 2;
  g[by][r.x0] = 'b';
  if (r.x1 > r.x0 + 1) g[by][r.x1] = 'b';
  g[ay][r.x0] = 'A';
  if (r.x1 - r.x0 >= 4) g[ay][r.x1] = 'b';
}

export function buildMaps() {
  const maps = [], roomsAll = [];
  for (let f = 0; f < FLOORS; f++) {
    let g, rooms = [];
    if (f === 4) {
      g = makeGrid('q'); carve(g, 1, 1, 26, 14);
      for (let y = 4; y <= 5; y++) for (let x = 12; x <= 13; x++) g[y][x] = 'T';
      for (const [x, y] of [[8, 10], [20, 11], [22, 3], [6, 3], [16, 12]]) g[y][x] = 'b';
      g[7][27] = 'P'; g[8][27] = 'P';
      g[7][1] = 'N'; g[8][1] = 'N';
      rooms = [{ x0: 3, y0: 1, x1: 26, y1: 14, door: [3, 7], north: true, roof: true }];
    } else {
      ({ g, rooms } = baseFloor());
      if (f === 0) {
        g[11][5] = 'G'; g[12][3] = 'S'; g[9][3] = 'g';
        for (const [x, y] of [[9, 2], [15, 4], [9, 12], [15, 12], [21, 2], [21, 12], [23, 4]]) g[y][x] = 'B';
        g[7][26] = 'U'; g[8][26] = 'U';
      } else if (f === 1) {
        carve(g, 7, 10, 23, 14);
        for (const x of [9, 10, 14, 15, 19, 20]) g[12][x] = 'b';
        for (let y = 11; y <= 13; y++) g[y][0] = 'X';
        g[3][9] = 'b'; g[1][7] = 'A'; g[1][21] = 'v'; g[4][20] = 'b'; g[4][22] = 'b';
        for (const x of [13, 15, 17]) g[1][x] = 't';
        g[7][26] = 'N'; g[8][26] = 'N'; g[7][1] = 'U'; g[8][1] = 'U';
        // merged mess hall counts as one room
        rooms = rooms.filter(r => !(r.x0 >= 7 && r.x1 <= 23 && !r.north));
        rooms.push({ x0: 7, y0: 10, x1: 23, y1: 14, door: [9, 9], north: false, mess: true });
      } else {
        for (const r of rooms) dorm(g, r);
        if (f === 2) {
          for (const x of [19, 21, 23]) { g[1][x] = 't'; }
          g[1][20] = '.'; g[1][22] = '.';
          g[7][1] = 'N'; g[8][1] = 'N'; g[7][26] = 'U'; g[8][26] = 'U';
          g[7][14] = 'o';
        } else {
          g[7][26] = 'N'; g[8][26] = 'N'; g[7][1] = 'U'; g[8][1] = 'U';
          g[7][2] = 'R'; g[8][2] = 'R';
        }
      }
    }
    maps.push(g); roomsAll.push(rooms);
  }
  return { maps, rooms: roomsAll };
}

export const DIARY = [
  { t: 'Warden ki diary, 3 June 2009', b: 'Aaj bhi chowkidar Ramlal ne raat ko poora hostel check kiya. Bachche use "Ravunix kaka" bulate hain, kyunki wo kabhi chalte nahi, bas ghungroo jaisi chaabiyon ki awaaz se pata chalta hai wo aa raha hai.' },
  { t: 'Ek student ka note', b: 'Mess ka khaana kharab hai, generator roz band hota hai. Basement mein jaana mana hai, par hum ne wahan bhi apna chhota sa adda bana liya hai.' },
  { t: 'Malik ka patra, 14 June 2009', b: 'Hostel ka bima nahi hua. Aag lage to bhi gate raat ko band rakho, kisi ko bahar mat jaane do. Chaabiyan sirf mere paas rahengi.' },
  { t: 'Ramlal ka aakhri panna', b: 'Aag lagi to maine gate ka tala todne ki koshish ki, par chaabiyan malik ke paas thi. Meri patni ne chhat par se bachchon ko pipe se utarne mein madad ki. Hum dono wahin rah gaye.' },
  { t: 'Kisi ka likha, bahut baad mein', b: 'Wo ab bhi hai. Wo chor samajhta hai har aane wale ko. Par jo uski diary ke saare panne padh le, shayad wo use pehchaan le. Chhat par jaao, pipe wahin hai.' },
];

export const INTRO = [
  'Saint Mary\'s Boys Hostel, 2009.\nEk raat ki aag, aur 40 se zyada kamre khaali ho gaye.\nHostel band kar diya gaya. Gate par tala.',
  '15 saal baad, ek dare ki wajah se tum aur tumhara dost andar ghuse.\nPeeche gate band ho gaya.\nGhungroo ki awaaz aayi... aur tumhara dost kabhi wapas nahi aaya.',
  'Aankh khuli to andhera tha.\nThanda farsh, tapakta paani, band generator ki gandh.\nTum hostel ke basement mein ho.\n\nUpar se ghungroo ki halki si awaaz aa rahi hai...\nAur wo neeche aa rahi hai.',
];
