import * as React from 'react';

import * as classNames from 'classnames';
const { default: FontAwesomeIcon } = require('@fortawesome/react-fontawesome');

const styles = require('./CheckIcon.scss');

interface Props {
  checked: boolean;
  className?: string;
}

export class CheckIcon extends React.Component<Props> {
  render() {
    const { checked } = this.props;
    const className = classNames(
      this.props.className,
      styles.component,
      checked ? styles.checked : styles.hidden,
    );
    return <FontAwesomeIcon className={className} icon="check" fixedWidth />;
  }
}