import * as React from 'react';

import classNames from 'classnames';

import { EnlirLimitBreak } from '../../data/enlir';
import { convertEnlirSkillToMrP, formatMrPSkill, MrPSkill } from '../../data/mrP/skill';
import {
  formatSoulBreakOrLegendMateriaName,
  limitBreakAbbrevAliases,
  styles,
  tierClass,
} from '../shared/SoulBreakShared';

interface Props {
  limitBreak: EnlirLimitBreak;
  className?: string;
}

const mrPLimitBreaks: { [id: number]: MrPSkill } = {};

export class LimitBreakListItem extends React.PureComponent<Props> {
  render() {
    const { limitBreak, className } = this.props;

    if (!mrPLimitBreaks[limitBreak.id]) {
      mrPLimitBreaks[limitBreak.id] = convertEnlirSkillToMrP(limitBreak);
    }
    const mrP = mrPLimitBreaks[limitBreak.id];

    const text = formatMrPSkill(mrP);

    const alias = limitBreakAbbrevAliases[limitBreak.id] || limitBreak.tier;

    const fullClassName = classNames(className, tierClass[limitBreak.tier], {
      [styles.jp]: !limitBreak.gl,
    });
    return (
      <>
        <tr className={fullClassName}>
          <td className={styles.tier}>{alias}</td>
          <td className={styles.name}>{formatSoulBreakOrLegendMateriaName(limitBreak)}</td>
          <td className={styles.effects}>{text || '???'}</td>
        </tr>
      </>
    );
  }
}
