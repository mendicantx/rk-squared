import * as React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Link } from 'react-router-dom';

import { RelicDrawGroup } from '../actions/relicDraws';
import { BadRelicDrawMessage } from '../components/relicDraws/BadRelicDrawMessage';
import { RelicDrawList } from '../components/relicDraws/RelicDrawList';
import { IState } from '../reducers';
import { getBannersAndGroups, RelicDrawBannersAndGroups } from '../selectors/relicDraws';

interface RouteParams {
  group: string;
}

interface Props {
  groups: {
    [group: string]: RelicDrawGroup;
  };
  bannersAndGroups: RelicDrawBannersAndGroups;
  groupLink: (group: string) => string;
  bannerLink: (bannerId: number) => string;
  backLink: string;
}

export class RelicDrawGroupPage extends React.PureComponent<
  Props & RouteComponentProps<RouteParams>
> {
  render() {
    const { groups, bannersAndGroups, match, backLink } = this.props;
    const group = groups[match.params.group];
    const details = bannersAndGroups[match.params.group];
    if (!group || !details) {
      return <BadRelicDrawMessage />;
    }
    return (
      <>
        <img src={group.imageUrl} />
        <p>
          <Link to={backLink}>back to all banners</Link>
        </p>
        <RelicDrawList
          details={details}
          bannerLink={this.props.bannerLink}
          groupLink={this.props.groupLink}
        />
      </>
    );
  }
}

export default connect((state: IState) => ({
  groups: state.relicDraws.groups,
  bannersAndGroups: getBannersAndGroups(state),
}))(RelicDrawGroupPage);
