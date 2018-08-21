import * as React from 'react';

interface Props {
  title: string;
  children: any;
}

export class Page extends React.Component<Props> {
  render() {
    const { title, children } = this.props;
    return (
      <div className="container">
        <h2 className="row">{title}</h2>
        {children}
      </div>
    );
  }
}
