import * as React from 'react';

import { ICellRendererParams } from 'ag-grid';

import {
  formatEstimatedScore,
  formatScore,
  isSub30,
  shouldUseEstimatedScore,
} from '../../actions/dungeonScores';
import { DungeonWithScore } from '../../selectors/dungeonsWithScore';
import { CheckIcon } from './CheckIcon';

export class TormentScoreCellRenderer extends React.Component<ICellRendererParams> {
  static ID = 'TORMENT_SCORE_CELL';

  render() {
    const { value } = this.props;
    const dungeon = value as DungeonWithScore;
    const useEstimated = shouldUseEstimatedScore(dungeon.score, dungeon.estimatedScore);
    const score = useEstimated ? dungeon.estimatedScore : dungeon.score;
    if (!score) {
      return null;
    }
    const sub30 = isSub30(score);
    const showTooltips = !sub30;
    return (
      <span data-tip={showTooltips ? dungeon.id : undefined} data-for={TormentScoreCellRenderer.ID}>
        {useEstimated ? formatEstimatedScore(score) : formatScore(score)}
        <CheckIcon checked={sub30} className={'ml-1'} />
      </span>
    );
  }
}