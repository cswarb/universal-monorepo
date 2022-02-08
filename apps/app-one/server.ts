import 'zone.js/node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppServerModule } from './src/main.server';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';
const http = require('http');

/*
https://angular.io/guide/universal
https://stackoverflow.com/questions/54291638/nguniversal-express-engine-request-nullinjector

- Node.js Express web server compiles HTML pages with Universal based on client requests

- Any web server technology can serve a Universal application as long as it can call Universal's renderModule() function.
The principles and decision points discussed here apply to any web server technology.

*/




// The Express app is exported so that it can be used by serverless Functions.
export function app(module: any) {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  //ngExpressEngine is a wrapper around Universal's renderModule()
  /*
    Tell express the engine is html and pass the promise. This engine's Promise callback returns the rendered page 
    to the web server, which then forwards it to the client in the HTTP response.
  */
  server.engine('html', ngExpressEngine({
    bootstrap: module,
    /* 
      bootstrap: The root NgModule or NgModule factory to use for bootstraping the application when rendering on the server. 
      For the example application, it is AppServerModule. It's the bridge between the Universal server-side renderer 
      and the Angular application.

      extraProviders: This property is optional and lets you specify dependency providers that apply only when
      rendering the application on the server. Do this when your application needs information that can only be 
      determined by the currently running server instance.
    */
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // TODO: implement data requests securely
  //Proxy to api/gateway. protocol is crucial
  //Data request: request URL that begins /api.
  //In a server-side rendered app, HTTP URLs must be absolute
  server.get('/api/**', createProxyMiddleware({ target: 'http://localhost:3000', changeOrigin: true }));

  // Serve static files from /browser - Static asset: all other requests.
  //Only honor requests to the dist folder, and therefore all assets must be put in here
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  //App navigation: request URL with no file extension. 
  //Filters for request URLs with no extensions and treats them as navigation requests.
  server.get('*', (req, res) => {
    res.render(indexHtml, 
    { 
      req, 
      res, 
      providers: [
        { provide: APP_BASE_HREF, useValue: req.baseUrl },
      ] 
    }, 
    (err: Error, html: string) => {
      res.status(html ? 200 : 500).send(html || err.message);
    });
  });

  return server;
}






function run() {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app(AppServerModule);
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}








// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
