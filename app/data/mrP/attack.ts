import * as _ from 'lodash';

import { EnlirElement, EnlirOtherSkill, EnlirSchool, EnlirSoulBreak } from '../enlir';
import { parseNumberString, parsePercentageCounts, toMrPFixed } from './util';

export interface ParsedEnlirAttack {
  damageType: 'phys' | 'white' | 'magic';
  randomChances?: string;
  damage: string;
  element: EnlirElement[] | null;
  school?: EnlirSchool;
  isAoE: boolean;
  isRanged: boolean;
  isJump: boolean;
  isOverstrike: boolean;
  isSummon: boolean;
  isNoMiss: boolean;
}

function describeDamage(attackMultiplier: number, numAttacks: number) {
  const multiplier = attackMultiplier * numAttacks;
  return toMrPFixed(multiplier) + (numAttacks !== 1 ? '/' + numAttacks : '');
}

function describeRandomDamage(
  attackMultiplier: number,
  randomAttacks: Array<[number, number]>,
): [string | undefined, string] {
  const percents = randomAttacks.map(([, percent]) => percent);
  const damages = randomAttacks.map(([count]) => describeDamage(attackMultiplier, count));
  const allSamePercentage = _.every(percents, i => i === percents[0]);
  if (allSamePercentage) {
    return [undefined, damages.join(' or ')];
  } else {
    return [percents.join('-') + '%', damages.join('-')];
  }
}

/**
 * Describes the "followed by" portion of an attack.  This is used for 20+1
 * AOSBs.
 */
function describeFollowedByAttack(effects: string): string | null {
  const m = effects.match(
    /followed by ([A-Za-z\-]+) ((?:group|random|single) )?(ranged )?(jump )?attacks? \(([0-9\.]+(?: each)?)\)( capped at 99999)?/,
  );
  if (!m) {
    return null;
  }
  // prettier-ignore
  const [
    ,
    numAttacksString,
    /*attackType*/,
    /*ranged*/,
    /*jump*/,
    attackMultiplierString,
    overstrike
  ] = m;
  const attackMultiplier = parseFloat(attackMultiplierString);
  const numAttacks = parseNumberString(numAttacksString);
  if (numAttacks == null) {
    return null;
  }

  let damage = '';
  damage += describeDamage(attackMultiplier, numAttacks);
  damage += overstrike ? ' overstrike' : '';
  return damage;
}

export function parseEnlirAttack(
  effects: string,
  skill: EnlirOtherSkill | EnlirSoulBreak,
): ParsedEnlirAttack | null {
  const m = effects.match(
    /([Rr]andomly deals .*|[A-Za-z\-]+) (?:(group|random|single) )?(ranged )?(jump )?attacks? \(([0-9\.]+(?: each)?)\)( capped at 99999)?(, 100% hit rate)?/,
  );
  if (!m) {
    return null;
  }

  const [
    ,
    numAttacksString,
    attackType,
    ranged,
    jump,
    attackMultiplierString,
    overstrike,
    noMiss,
  ] = m;
  const randomAttacks = parsePercentageCounts(numAttacksString);
  const attackMultiplier = parseFloat(attackMultiplierString);
  const numAttacks = parseNumberString(numAttacksString);
  if ((randomAttacks == null && numAttacks == null) || skill.formula == null) {
    return null;
  }

  let randomChances: string | undefined;
  let damage: string;
  if (randomAttacks) {
    [randomChances, damage] = describeRandomDamage(attackMultiplier, randomAttacks);
  } else {
    randomChances = undefined;
    damage = describeDamage(attackMultiplier, numAttacks!);
  }
  const followedBy = describeFollowedByAttack(skill.effects);
  if (followedBy) {
    damage += ', then ' + followedBy + ',';
  }

  return {
    isAoE: attackType === 'group',
    damageType: skill.formula === 'Physical' ? 'phys' : skill.type === 'WHT' ? 'white' : 'magic',
    damage,
    randomChances,
    element: skill.element,
    school: 'school' in skill ? (skill.school as EnlirSchool) : undefined,
    isRanged: !!ranged && !jump,
    isJump: !!jump,
    isOverstrike: !!overstrike,
    isSummon: skill.type === 'SUM',
    isNoMiss: !!noMiss,
  };
}
