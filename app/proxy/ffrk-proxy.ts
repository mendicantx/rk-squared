import * as cheerio from 'cheerio';
import * as connect from 'connect';
import * as fs from 'fs';
import * as http from 'http';
import * as httpProxy from 'http-proxy';
import * as https from 'https';
import * as moment from 'moment';
import * as net from 'net';
import * as path from 'path';
import * as querystring from 'querystring';
import * as streamBuffers from 'stream-buffers';
import * as url from 'url';

import { Store } from 'redux';

import * as _ from 'lodash';

const transformerProxy = require('transformer-proxy');

import battle from './battle';
import characters from './characters';
import { StartupHandler } from './common';
import dungeons from './dungeons';
import dungeonScores from './dungeonScores';
import itemUpdates from './itemUpdates';
import options from './options';
import recordMateria from './recordMateria';
import relicDraws from './relicDraws';
import { sessionHandler } from './session';

import { showMessage } from '../actions/messages';
import { updateLastTraffic, updateProxyStatus } from '../actions/proxy';
import { issuesUrl } from '../data/resources';
import { IState } from '../reducers';
import { logger } from '../utils/logger';
import { escapeHtml } from '../utils/textUtils';
import { tlsCert, tlsSites } from './tls';
import { decodeData, encodeData, getIpAddresses, getStoragePath, setStoragePath } from './util';

interface ProxyIncomingMessage extends http.IncomingMessage {
  bodyStream: streamBuffers.WritableStreamBuffer | undefined;
  body: any | undefined;
}

const handlers = [
  battle,
  characters,
  dungeons,
  relicDraws,
  itemUpdates,
  recordMateria,
  dungeonScores,

  // Apply options last so that changes that options make won't interfere with
  // other processing.
  options,
];

const ffrkRegex = /ffrk\.denagames\.com\/dff|dff\.sp\.mbga\.jp\/dff/;
const port = 8888;
const httpsPort = 8889;

function isFfrkApiRequest(req: http.IncomingMessage) {
  return (
    req.headers['accept'] &&
    req.headers['accept']!.indexOf('application/json') !== -1 &&
    req.headers['x-requested-with'] === 'XMLHttpRequest'
  );
}

function isFfrkStartupRequest(req: http.IncomingMessage) {
  return (
    (req.url === 'http://ffrk.denagames.com/dff/' ||
      req.url === 'https://ffrk.denagames.com/dff/' ||
      req.url === 'http://dff.sp.mbga.jp/dff/' ||
      req.url === 'https://dff.sp.mbga.jp/dff/') &&
    req.headers['accept'] &&
    req.headers['accept']!.indexOf('text/html') !== -1
  );
}

let capturePath: string;

function getCaptureFilename(req: http.IncomingMessage, extension: string) {
  if (req.url == null) {
    throw new Error('No URL included in request');
  }
  if (capturePath == null) {
    capturePath = getStoragePath('captures');
  }
  const datestamp = moment().format('YYYY-MM-DD-HH-mm-ss-SSS');
  const urlPath = url.parse(req.url).pathname!.replace(/\//g, '_');
  return path.join(capturePath, datestamp + urlPath + extension);
}

function checkRequestBody(req: http.IncomingMessage) {
  const proxyReq = req as ProxyIncomingMessage;
  if (proxyReq.bodyStream == null) {
    return;
  }
  proxyReq.body = proxyReq.bodyStream.getContentsAsString('utf8');
  try {
    proxyReq.body = JSON.parse(proxyReq.body);
  } catch (e) {}
}

function recordRawCapturedData(data: any, req: http.IncomingMessage, extension: string) {
  const filename = getCaptureFilename(req, extension);

  return new Promise((resolve, reject) => {
    fs.writeFile(filename, data, err => {
      if (err) {
        reject(err);
      } else {
        resolve(filename);
      }
    });
  });
}

function recordCapturedData(data: any, req: http.IncomingMessage, res: http.ServerResponse) {
  const { url, method, headers } = req; // tslint:disable-line no-shadowed-variable
  const response = { headers: res.getHeaders() };

  const proxyReq = req as ProxyIncomingMessage;
  const requestBody = proxyReq.body;

  return recordRawCapturedData(
    JSON.stringify({ url, method, headers, requestBody, response, data }, null, 2),
    req,
    '.json',
  );
}

const UTF8_BOM = 0xfeff;

function extractJson($el: Cheerio) {
  const rawJson = $el.html();
  if (rawJson == null) {
    throw new Error('Failed to find data');
  } else {
    return JSON.parse(rawJson);
  }
}

function getFragmentsToCheck(reqUrl: url.UrlWithStringQuery) {
  const urlPathname = reqUrl.pathname as string;
  const urlParts = urlPathname.split('/');

  // URL fragments to check.  We key most URLs using the last fragment (e.g.,
  // "/dff/event/challenge/942/get_battle_init_data" becomes
  // "get_battle_init_data"), but we also check check the last two fragments
  // to handle cases like "/dff/beast/list".
  const fragments = [urlParts[urlParts.length - 1]];
  if (urlParts.length > 1) {
    fragments.push(urlParts[urlParts.length - 2] + '/' + urlParts[urlParts.length - 1]);
  }

  return fragments;
}

function checkHandlers(
  data: {},
  req: http.IncomingMessage,
  res: http.ServerResponse,
  store: Store<IState>,
  fragments?: string[],
) {
  const reqUrl = url.parse(req.url as string);
  const reqQuery = reqUrl.query ? querystring.parse(reqUrl.query) : undefined;
  const reqBody = (req as ProxyIncomingMessage).body;
  if (fragments == null) {
    fragments = getFragmentsToCheck(reqUrl);
  }

  let changed = false;
  for (const handler of handlers) {
    for (const fragment of fragments) {
      if (handler[fragment]) {
        const newData = handler[fragment](data, store, {
          query: reqQuery,
          body: reqBody,
          url: reqUrl,
        });
        if (newData !== undefined) {
          changed = true;
          data = newData;
        }
        break;
      }
    }
  }
  return changed ? data : undefined;
}

function handleFfrkApiRequest(
  data: Buffer,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  store: Store<IState>,
) {
  try {
    let decoded = decodeData(data, res).toString();
    if (decoded.charCodeAt(0) === UTF8_BOM) {
      decoded = decoded.substr(1);
    }
    decoded = JSON.parse(decoded);

    checkRequestBody(req);

    if (store.getState().options.saveTrafficCaptures) {
      recordCapturedData(decoded, req, res)
        .catch(err => logger.error(`Failed to save data capture: ${err}`))
        .then(filename => logger.debug(`Saved to ${filename}`));
    }

    sessionHandler(decoded, req, res, store);

    const newData = checkHandlers(decoded, req, res, store);
    if (newData !== undefined) {
      data = encodeData(String.fromCharCode(UTF8_BOM) + JSON.stringify(newData), res);
    }
  } catch (error) {
    logger.error(error);
  }
  return data;
}

function handleFfrkStartupRequest(
  data: Buffer,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  store: Store<IState>,
) {
  if (res.statusCode === 302 && res.hasHeader('Location')) {
    logger.debug(`Redirected to ${res.getHeader('Location')} on startup; ignoring`);
    return data;
  }

  try {
    const decoded = decodeData(data, res).toString();
    const $ = cheerio.load(decoded);

    const appInitData = extractJson($('script[data-app-init-data]'));
    const textMaster = extractJson($('#text-master'));
    const startupData = { appInitData, textMaster };
    if (store.getState().options.saveTrafficCaptures) {
      // Optionally save full startup data.  Disabled by default; it's big and
      // hard to work with.
      if (0) {
        recordRawCapturedData(decoded, req, '.html')
          .catch(err => logger.error(`Failed to save raw data capture: ${err}`))
          .then(filename => logger.debug(`Saved to ${filename}`));
      }
      recordCapturedData(startupData, req, res)
        .catch(err => logger.error(`Failed to save data capture: ${err}`))
        .then(filename => logger.debug(`Saved to ${filename}`));
    }

    sessionHandler(decoded, req, res, store);

    checkHandlers(startupData, req, res, store, [StartupHandler]);
  } catch (error) {
    logger.error(error);
  }
  return data;
}

function handleInternalRequests(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  certPem: string,
) {
  if (!req.url) {
    return false;
  }

  const reqUrl = url.parse(req.url);
  if (
    (reqUrl.host === 'www.rk-squared.com' || reqUrl.host === 'rk-squared.com') &&
    reqUrl.pathname === '/cert'
  ) {
    res.setHeader('Content-Type', 'application/x-pem-file');
    res.setHeader('Content-Disposition', 'attachment; filename=RKSquared.cer');
    res.write(Buffer.from(certPem));
    res.end();
    return true;
  }

  return false;
}

function showServerError(e: any, description: string, store: Store<IState>) {
  // Is it okay to treat *all* server errors as something to yell about?  E.g.,
  // errors within proxy connections seem to be routine, but I've only seen
  // server errors if something is already listening on the port.
  logger.error('Error from ' + description);
  logger.error(e);
  store.dispatch(
    showMessage({
      text: {
        __html:
          `<p>Error from ${description}: ` +
          escapeHtml(e.message) +
          '</p>' +
          "<p>Please check that you aren't running other network software that may interfere with RK&sup2;.</p>" +
          '<p class="mb-0">If you continue to have trouble, please file an issue at the ' +
          `<a href="${issuesUrl}" class="alert-link" target="_blank">RK² issues page</a>.` +
          '</p>',
      },
      id: description,
      color: 'danger',
    }),
  );
}

export function createFfrkProxy(store: Store<IState>, userDataPath: string) {
  setStoragePath(userDataPath);
  store.dispatch(updateProxyStatus({ capturePath: userDataPath }));

  // FIXME: Need error handling somewhere in here
  function transformerFunction(data: Buffer, req: http.IncomingMessage, res: http.ServerResponse) {
    if (isFfrkApiRequest(req)) {
      return handleFfrkApiRequest(data, req, res, store);
    } else if (isFfrkStartupRequest(req)) {
      return handleFfrkStartupRequest(data, req, res, store);
    } else {
      return data;
    }
  }

  const proxy = httpProxy.createProxyServer({});
  proxy.on('error', e => {
    logger.debug('Error within proxy');
    logger.debug(e);
  });

  const app = connect();

  app.use(transformerProxy(transformerFunction, { match: ffrkRegex }));
  // Disabled; not currently functional:
  // app.use(transformerProxy(cacheTransformerFunction, { match: /127\.0\.0\.1/ }));

  app.use((req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
    logger.debug(req.url as string);
    store.dispatch(updateLastTraffic());
    // console.log(req.headers);
    next();
  });

  app.use((req: http.IncomingMessage, res: http.ServerResponse) => {
    req.on('error', e => {
      logger.debug('Error within proxy req');
      logger.debug(e);
    });
    res.on('error', e => {
      logger.debug('Error within proxy res');
      logger.debug(e);
    });

    // Disabled; not currently functional:
    /*
    const resourceUrl = parseFfrkCacheRequest(req);
    if (resourceUrl != null) {
      proxy.web(req, res, {
        target: `http://ffrk.denagames.com/dff/${resourceUrl}`,
        ignorePath: true
      });
      return;
    }
    */

    if (handleInternalRequests(req, res, tlsCert.ca)) {
      return;
    }

    if (req.url && req.url.match(ffrkRegex) && req.method === 'POST') {
      const proxyReq = req as ProxyIncomingMessage;
      proxyReq.bodyStream = new streamBuffers.WritableStreamBuffer();
      req.pipe(proxyReq.bodyStream);
    }

    const reqUrl = url.parse(req.url as string);
    proxy.web(req, res, {
      target: reqUrl.protocol + '//' + reqUrl.host,
    });
  });

  const tlsApp = connect();

  tlsApp.use((req: http.IncomingMessage, res: http.ServerResponse, next: () => void) => {
    const reqUrl = req.url as string;
    const host = req.headers.host;
    logger.debug(`TLS proxy: ${reqUrl}, Host: ${host}`);
    req.url = `https://${host}${reqUrl}`;
    app(req, res, next);
  });

  const server = http.createServer(app);
  const httpsServer = https.createServer(tlsCert, tlsApp);

  server.on('error', e => showServerError(e, 'proxy server', store));
  httpsServer.on('error', e => showServerError(e, 'HTTPS proxy server', store));

  // Proxy (tunnel) HTTPS requests.  For more information:
  // https://nodejs.org/api/http.html#http_event_connect
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT
  server.on('connect', (req, clientSocket, head) => {
    logger.debug(`CONNECT ${req.url}`);
    store.dispatch(updateLastTraffic());

    let serverUrl = url.parse(`https://${req.url}`);
    // Check for FFRK HTTPS requests in particular and proxy them internally.
    if (serverUrl.hostname && tlsSites.indexOf(serverUrl.hostname) !== -1) {
      serverUrl = url.parse(`https://127.0.0.1:${httpsPort}`);
    }
    const serverPort = +(serverUrl.port || 80);

    let connected = false;
    const serverSocket = net
      .connect(serverPort, serverUrl.hostname, () => {
        connected = true;

        clientSocket.write(
          'HTTP/1.1 200 Connection Established\r\n' + 'Proxy-agent: Node.js-Proxy\r\n' + '\r\n',
        );
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      })
      .on('error', (e: Error) => {
        logger.debug(
          `Error ${connected ? 'communicating with' : 'connecting to'} ${serverUrl.hostname}`,
        );
        logger.debug(e);
        if (!connected) {
          // Unable to connect to destination - send a clean error back to the client
          clientSocket.end(
            'HTTP/1.1 502 Bad Gateway\r\n' + 'Proxy-agent: Node.js-Proxy\r\n' + '\r\n' + e,
          );
        } else {
          // An error occurred in mid-connection - abort the client connection so
          // the client knows.
          clientSocket.destroy();
        }
      });
    clientSocket.on('error', (e: Error) => {
      logger.debug(`Error communicating with ${serverUrl.hostname}`);
      logger.debug(e);
      serverSocket.destroy();
    });
  });

  let ipAddress: string[];
  const updateNetwork = () => {
    const newIpAddress = getIpAddresses();

    // macOS, for example, may briefly report no IP addresses when it first
    // wakes from sleep.  To avoid spamming bogus messages in that case, don't
    // dispatch updates if no IP addresses are available.
    if (!newIpAddress.length) {
      return;
    }

    if (!_.isEqual(newIpAddress, ipAddress)) {
      ipAddress = newIpAddress;
      logger.info(`Listening on ${ipAddress.join(',')}, port ${port}`);
      store.dispatch(updateProxyStatus({ ipAddress, port }));
    }
  };
  updateNetwork();
  setInterval(updateNetwork, 60 * 1000);

  server.listen(port);
  httpsServer.listen(httpsPort, '127.0.0.1');
}
