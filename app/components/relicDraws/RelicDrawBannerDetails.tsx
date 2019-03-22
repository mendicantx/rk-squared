import * as React from 'react';

import * as _ from 'lodash';

import {
  getOffBannerRelics,
  RelicDrawBanner,
  RelicDrawProbabilities,
} from '../../actions/relicDraws';
import { enlir } from '../../data/enlir';
import { tierOrder } from '../../data/mrP';
import RelicDrawBannerTable from './RelicDrawBannerTable';

interface Props {
  banner: RelicDrawBanner;
  probabilities?: RelicDrawProbabilities;
}

function sortRelics(relicIds: number[]) {
  return _.sortBy(relicIds, [
    (i: number) =>
      enlir.relics[i].character ? enlir.charactersByName[enlir.relics[i].character!].id : 0,
    (i: number) =>
      enlir.relicSoulBreaks[i] ? -tierOrder[enlir.relicSoulBreaks[i].tier] : -Infinity,
    (i: number) =>
      enlir.relicSoulBreaks[i]
        ? enlir.relicSoulBreaks[i].id
        : enlir.relicLegendMateria[i]
        ? enlir.relicLegendMateria[i].id
        : 0,
  ]);
}

export class RelicDrawBannerDetails extends React.PureComponent<Props> {
  renderFeatured() {
    const { banner, probabilities } = this.props;
    if (!banner.bannerRelics || !banner.bannerRelics.length) {
      return null;
    }
    return (
      <RelicDrawBannerTable
        title={'Featured Relics'}
        relics={banner.bannerRelics}
        probabilities={probabilities}
      />
    );
  }

  renderAll() {
    const { banner, probabilities } = this.props;
    if ((banner.bannerRelics && banner.bannerRelics.length) || !probabilities) {
      return null;
    }
    return (
      <RelicDrawBannerTable
        title={'All Relics'}
        relics={sortRelics(_.keys(probabilities.byRelic).map(i => +i))}
        probabilities={probabilities}
      />
    );
  }

  renderOffBanner() {
    const { banner, probabilities } = this.props;
    const offBanner =
      banner.bannerRelics && banner.bannerRelics.length && probabilities
        ? sortRelics(getOffBannerRelics(banner, probabilities))
        : undefined;
    if (!offBanner) {
      return null;
    }
    return (
      <RelicDrawBannerTable title={'Off-Banner'} relics={offBanner} probabilities={probabilities} />
    );
  }

  renderFallback() {
    const { banner, probabilities } = this.props;
    if ((banner.bannerRelics && banner.bannerRelics.length) || probabilities) {
      return null;
    }
    return (
      <tr>
        <td>No details are available for this banner.</td>
      </tr>
    );
  }

  render() {
    return (
      <>
        {this.renderFeatured()}
        {this.renderAll()}
        {this.renderOffBanner()}
        {this.renderFallback()}
      </>
    );
  }
}
