import { MACHINES, TREE_GROUP_NAMES, DAMAGE_TYPE_NAMES, type TreeGroup, type DamageType } from '../data/machines';
import { PLANETS } from '../data/planets';
import { RESOURCES } from '../data/resources';
import { PERCENT_POINT_STATS, STAT_NAMES, type Condition, type Modifier } from './types';

const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

const CATEGORY_TAGS: Record<string, string> = {
  electric: 'elektrische Maschinen',
  crafter: 'Fertiger',
  extractor: 'Förderanlagen',
  hand: 'Hand',
};

export function tagName(tag: string): string {
  if (tag in TREE_GROUP_NAMES) return TREE_GROUP_NAMES[tag as TreeGroup];
  if (tag in CATEGORY_TAGS) return CATEGORY_TAGS[tag];
  if (tag.startsWith('planet:')) return `auf ${PLANETS[tag.slice(7)]?.name ?? tag.slice(7)}`;
  if (tag.startsWith('res:')) return RESOURCES[tag.slice(4)]?.name ?? tag.slice(4);
  if (tag.startsWith('dmg:')) return `${DAMAGE_TYPE_NAMES[tag.slice(4) as DamageType]}-Schaden`;
  if (tag.startsWith('tier:')) return `Stufe ${tag.slice(5)}`;
  if (MACHINES[tag]) return MACHINES[tag].name;
  return tag;
}

function conditionText(c: Condition): string {
  switch (c.kind) {
    case 'perAdjacent':
      return ` pro angrenzendem Gebäude (${tagName(c.tag)})${c.max ? `, max. ${c.max}` : ''}`;
    case 'noAdjacent':
      return ` ohne angrenzende ${tagName(c.tag)}`;
    case 'minAdjacent':
      return ` mit mindestens ${c.count} angrenzenden ${tagName(c.tag)}`;
    case 'perEmptySocket':
      return ' pro leerem Modulsockel';
  }
}

export function describeModifier(m: Modifier): string {
  const stat = STAT_NAMES[m.stat];
  const v = m.value;
  const sign = v >= 0 ? '+' : '−';
  const abs = nf.format(Math.abs(v));
  let text: string;
  if (m.kind === 'flat') {
    text = PERCENT_POINT_STATS.has(m.stat) ? `${sign}${abs} % ${stat}` : `${sign}${abs} ${stat}`;
  } else if (m.kind === 'inc') {
    text = `${abs} % ${v >= 0 ? 'erhöhte' : 'verringerte'} ${stat}`;
  } else {
    text = `${abs} % ${v >= 0 ? 'mehr' : 'weniger'} ${stat}`;
  }
  const tags = m.tags?.filter((t) => !t.startsWith('planet:')) ?? [];
  const planet = m.tags?.find((t) => t.startsWith('planet:'));
  if (tags.length) text += ` (${tags.map(tagName).join(', ')})`;
  if (planet) text += ` ${tagName(planet)}`;
  if (m.condition) text += conditionText(m.condition);
  return text;
}
