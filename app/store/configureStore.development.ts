import { applyMiddleware, compose, createStore, Store } from 'redux';

import { createHashHistory } from 'history';
import { push, routerMiddleware } from 'react-router-redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

const { forwardToMain } = require('electron-redux');

import { IState, rootReducer } from '../reducers';


declare const window: Window & {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?(a: any): void;
};

declare const module: NodeModule & {
  hot?: {
    accept(...args: any[]): any;
  }
};

const actionCreators = {
  push
};

const logger = (createLogger as any)({
  level: 'info',
  collapsed: true
});

const history = createHashHistory();
const router = routerMiddleware(history);

// If Redux DevTools Extension is installed use it, otherwise use Redux compose
/* eslint-disable no-underscore-dangle */
const composeEnhancers: typeof compose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ?
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
    // Options: http://zalmoxisus.github.io/redux-devtools-extension/API/Arguments.html
    actionCreators
  }) as any :
  compose;
/* eslint-enable no-underscore-dangle */

const enhancer = composeEnhancers(
  applyMiddleware(forwardToMain, thunk, router, logger)
);

export = {
  history,
  configureStore(initialState?: IState): Store<IState> {
    const store = initialState == null
      ? createStore(rootReducer, enhancer)
      : createStore(rootReducer, initialState, enhancer);

    if (module.hot) {
      module.hot.accept('../reducers', () =>
        store.replaceReducer(require('../reducers')) // eslint-disable-line global-require
      );
    }

    return store;
  }
};