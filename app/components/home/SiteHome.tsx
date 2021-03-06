import * as React from 'react';
import { Link } from 'react-router-dom';

import { ffrkCommunityUrl, gameUrl, misterPUrl, redditUrl } from '../../data/resources';
import { SiteExternalLink } from '../common/SiteExternalLink';
import { AppFeatures } from './AppFeatures';
import { BinaryDownloadButton } from './BinaryDownloadButton';

export class SiteHome extends React.PureComponent {
  render() {
    return (
      <div>
        <p>
          RK Squared is a record keeper for{' '}
          <SiteExternalLink href={gameUrl}>Final Fantasy Record Keeper (FFRK)</SiteExternalLink>.
          It's available both as a web site and as an application for the Mac and PC.
        </p>

        <h3>The site</h3>
        <p>
          Information about the game, gathered and presented with help from the{' '}
          <SiteExternalLink href={ffrkCommunityUrl}>FFRK Community Database</SiteExternalLink>,{' '}
          <SiteExternalLink href={misterPUrl}>MisterP's PDF</SiteExternalLink>,{' '}
          <SiteExternalLink href={redditUrl}>Reddit</SiteExternalLink>, and the developer's own data
          mining.
        </p>

        <h3>The application</h3>
        <p>
          The same information as the site, plus features to automatically track and manage your
          game progress:
        </p>
        <AppFeatures />
        <BinaryDownloadButton platform={'windows'} className="mr-2" />
        <BinaryDownloadButton platform={'mac'} />
        <Link to={'/appMoreInfo'} className="btn btn-default">
          More Info
        </Link>
      </div>
    );
  }
}
