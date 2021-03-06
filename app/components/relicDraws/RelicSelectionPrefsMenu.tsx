import * as React from 'react';
import { connect } from 'react-redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { ShowRelicSelectionType, updatePrefs } from '../../actions/prefs';
import { IState } from '../../reducers';
import { DivDropdown } from '../common/DivDropdown';
import { DropdownDivider, DropdownItem } from '../common/Dropdown';
import { Bullet, Check } from '../common/Glyphs';

interface Prefs {
  hideRelicSelectionDupes?: boolean;
  showRelicSelections?: ShowRelicSelectionType;
  showNewRelicSelectionsOnly?: boolean;
}

interface Props extends Prefs {
  isAnonymous?: boolean;
  updateRelicSelection: (prefs: Prefs) => void;
  className?: string;
}

export class RelicSelectionPrefsMenu extends React.PureComponent<Props> {
  render() {
    const {
      isAnonymous,
      hideRelicSelectionDupes,
      showNewRelicSelectionsOnly,
      updateRelicSelection,
      className,
    } = this.props;
    const showRelicSelections =
      this.props.showRelicSelections != null
        ? this.props.showRelicSelections
        : ShowRelicSelectionType.Default;

    const select = (selected: ShowRelicSelectionType) => () =>
      updateRelicSelection({ showRelicSelections: selected });
    const toggle = (prop: keyof Prefs) => () => updateRelicSelection({ [prop]: !this.props[prop] });

    // Due to a bug in our old version of Electron, Popper.js doesn't handle
    // sticky positioning correctly, so optionally disable it:
    // https://github.com/popperjs/popper.js/issues/253
    const staticPosition = !!process.env.IS_ELECTRON;
    // TODO: Retest once we upgrade to Electron 7.x

    return (
      <DivDropdown
        id="relicSelectionPrefsDropdown"
        label="preferences"
        className={className}
        linkClassName="caret-off"
        display={<FontAwesomeIcon icon="cog" aria-label="Settings" />}
        right={true}
        staticPosition={staticPosition}
      >
        <DropdownItem onClick={select(ShowRelicSelectionType.All)}>
          <Bullet show={showRelicSelections === ShowRelicSelectionType.All} />
          Show all anima lens selections
        </DropdownItem>
        <DropdownItem onClick={select(ShowRelicSelectionType.HideCurrentAnima)}>
          <Bullet show={showRelicSelections === ShowRelicSelectionType.HideCurrentAnima} />
          Hide current anima lens selections
        </DropdownItem>
        <DropdownItem onClick={select(ShowRelicSelectionType.HideAllAnima)}>
          <Bullet show={showRelicSelections === ShowRelicSelectionType.HideAllAnima} />
          Hide all anima lens selections
        </DropdownItem>

        <DropdownDivider />

        {!isAnonymous && (
          <DropdownItem onClick={toggle('hideRelicSelectionDupes')}>
            <Check show={!!hideRelicSelectionDupes} />
            Hide dupes
          </DropdownItem>
        )}
        <DropdownItem onClick={toggle('showNewRelicSelectionsOnly')}>
          <Check show={!!showNewRelicSelectionsOnly} />
          Show new selections only
        </DropdownItem>
      </DivDropdown>
    );
  }
}

export default connect(
  ({
    prefs: { hideRelicSelectionDupes, showRelicSelections, showNewRelicSelectionsOnly },
  }: IState) => ({
    hideRelicSelectionDupes,
    showRelicSelections,
    showNewRelicSelectionsOnly,
  }),
  dispatch => ({
    updateRelicSelection: (prefs: Prefs) => dispatch(updatePrefs(prefs)),
  }),
)(RelicSelectionPrefsMenu);
