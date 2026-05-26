export type MarketUpdateMediaType = 'image' | 'video';

export type MarketUpdateMediaItem = {
  name: string;
  object: string;
  url: string;
  type: MarketUpdateMediaType;
  alt: string;
};

const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const imageRange = (folder: string, count: number, extension = 'jpg') =>
  Array.from({ length: count }, (_, index) => `market-updates/${folder}/${index + 1}.${extension}`);

const normalizeMarketUpdateKey = (date: string) => {
  const trimmed = date.trim().toLowerCase().replace(/^market-updates\//, '');
  const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!dateMatch) {
    return trimmed;
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const monthKey = monthKeys[month - 1];

  return monthKey ? `dmu${day}${monthKey}` : trimmed;
};

const mediaTypeFor = (object: string): MarketUpdateMediaType =>
  /\.(mp4|mov|webm)$/i.test(object) ? 'video' : 'image';

const toMediaItem = (date: string, object: string): MarketUpdateMediaItem => {
  const name = object.split('/').pop() || object;

  return {
    name,
    object,
    url: `/api/community/assets/${object}`,
    type: mediaTypeFor(object),
    alt: `Market update ${date} supporting media ${name.replace(/\.[^.]+$/, '')}`,
  };
};

export const MARKET_UPDATE_MEDIA_OBJECTS = {
  dmu2apr: [...imageRange('dmu2apr', 9), 'market-updates/dmu2apr/1.mp4'],
  dmu3apr: [...imageRange('dmu3apr', 13), 'market-updates/dmu3apr/1.mp4'],
  dmu4apr: imageRange('dmu4apr', 9),
  dmu7apr: imageRange('dmu7apr', 11, 'jpeg'),
  dmu8apr: imageRange('dmu8apr', 20),
  dmu9apr: imageRange('dmu9apr', 7),
  dmu10apr: imageRange('dmu10apr', 6),
  dmu11apr: imageRange('dmu11apr', 8),
  dmu15apr: imageRange('dmu15apr', 5),
  dmu16apr: [
    ...imageRange('dmu16apr', 13),
    'market-updates/dmu16apr/14.mp4',
    ...Array.from({ length: 3 }, (_, index) => `market-updates/dmu16apr/${index + 15}.jpg`),
  ],
  dmu17apr: [
    ...imageRange('dmu17apr', 6),
    'market-updates/dmu17apr/1.mp4',
    'market-updates/dmu17apr/2.mp4',
  ],
} as const satisfies Record<string, readonly string[]>;

export const getMarketUpdateMediaObjects = (date: string) =>
  MARKET_UPDATE_MEDIA_OBJECTS[normalizeMarketUpdateKey(date) as keyof typeof MARKET_UPDATE_MEDIA_OBJECTS] ?? [];

export const getMarketUpdateMediaItems = (date: string) => {
  const key = normalizeMarketUpdateKey(date);

  return getMarketUpdateMediaObjects(date).map((object) => toMediaItem(key, object));
};
