import * as React from 'react';

import CardiaGrid from '../components/dungeonScores/CardiaGrid';
import DarkOdinGrid from '../components/dungeonScores/DarkOdinGrid';
import MagiciteGrid from '../components/dungeonScores/MagiciteGrid';
import { Page } from './Page';

const styles = require('./DungeonScoresPage.scss');

export default class DungeonScoresPage extends React.Component {
  render() {
    return (
      <Page title="Dungeon Scores" contentClassName={styles.component}>
        <h4 className={styles.firstHeader}>Cardia</h4>
        <CardiaGrid />

        <h4>Magicite</h4>
        <MagiciteGrid />

        <h4>Dark Odin</h4>
        <DarkOdinGrid />

        <div className={`alert alert-secondary ${styles.howToTip}`}>
          <strong>Tip:</strong> You may need to enter a dungeon in order to get complete time and
          percent complete information.
        </div>
      </Page>
    );
  }
}
