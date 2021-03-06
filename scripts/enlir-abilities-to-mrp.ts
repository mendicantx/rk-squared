#!/usr/bin/env -S npx ts-node

import * as _ from 'lodash';

import { enlir } from '../app/data';
import { convertEnlirSkillToMrP, formatMrPSkill } from '../app/data/mrP/skill';
import { getOrbCosts } from '../app/data/orbDetails';
import { logForCli } from '../app/utils/logger';

logForCli();

const onlyAbilities = process.argv.slice(2);

for (const ability of _.sortBy(_.values(enlir.abilities), [i => -i.rarity, 'school', 'name'])) {
  if (onlyAbilities.length && onlyAbilities.indexOf(ability.name) === -1) {
    continue;
  }

  try {
    const mrP = convertEnlirSkillToMrP(ability);

    const text = formatMrPSkill(mrP);
    const costs = getOrbCosts(ability);
    const costText = '(' + costs.map(i => i.cost + ' ' + i.orbType).join(', ') + ')';
    const character = ability.recordBoardCharacter ? ' - ' + ability.recordBoardCharacter : '';
    console.log(
      ability.name +
        ` (${ability.rarity}* ${ability.school}${character}): ` +
        text +
        ' ' +
        costText,
    );
  } catch (e) {
    console.error(`Failed to process ${ability.name}`);
    console.error(e);
  }
}
