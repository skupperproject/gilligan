# Console developers guide

First version written by Ernest Allen, 16st August 2021


CODE LOCATION
=============

Dispatch: https://github.com/apache/qpid-dispatch/tree/main/console/react

Skupper: <https://github.com/skupperproject/gilligan>

CODE ORGANIZATION
=================

Both consoles were created using create-react-app and therefore follow the directory layout used by create-react-app at the time the console was created. The directory structure is:

* src/
  * pages/
    * Contains a directory for each top level page. Each directory contains the component .js files, the style sheet that is specific to that page, and any tests for the components.
    * The names of the javascript files that contain the definition of the components are the same as the component names. The file names are camelCase while the components defined therein are PascalCase. For example, the component OverviewPage is defined in the file src/pages/siteInfo/overviewPage.js.
    * The test files are named with the component file name with .test.js as the file ending. The test for the component SiteInfoPage is /src/pages/siteInfo/siteInfoPage.test.js 

* public/data/
  * Contains any files that need to be loaded at run-time. Currently, the files in this directory are JSON files that represent the data that is expected to be returned from the site-controller for the various REST endpoints. This data is used during development and testing only. The data file names are the same as the endpoint with .json as the extension. For example, the call to the /DATA endpoint  will load the file `public/data/DATA.json` during development and testing.
  * The file `src/restService.js` attempts to retrieve the data from the `protocol//domain:port` that is serving the console. If the environment variable NODE_ENV  is set to `development` or `test`, `restService.js` will load the data from the files in the src/public/data directory. 
  * The command `yarn start` will start an HTTP server and set the environment variable to "development". 
  * The command `yarn test` will start the testing suite and set the environment variable to "test".

* node_modules/
  * Contains the node js dependencies. This directory is created and populated with `yarn install`. The dependencies are defined in package.json.

* build/
  * Contains the optimized release code. This is created using `yarn build`. The files in the directory are the release artifacts.

CODING CONVENTION
=================

The consoles use React and follow naming and coding conventions recommended for all React applications. 

Components are defined using PascalCase.

Styles are defined using snake-case.

Local variables are defined using camelCase.

Indents are 2 spaces.

String literals are surrounded by double quotes.

Code lines are separated by semicolons.

FRAMEWORKS
==========

React: version 17. https://reactjs.org/docs/getting-started.html

Patternfly version 4. <https://www.patternfly.org/v4/>

Jest: <https://jestjs.io/docs/tutorial-react>. Is used for testing.

INSTALLATION FOR DEVELOPMENT
============================

The following commands are specific to the skupper console GIlligan, but can be easily adapted for the dispatch console.

    $ git clone <https://github.com/skupperproject/gilligan>
    $ cd gilligan
    $ yarn install
    $ yarn start

The `yarn install` command downloads the dependencies defined in package.json into the node_modules/ directory.

The `yarn start` command starts the development server and loads the console into the default web browser. It also sets the NODE_ENV environment variable to "development". If the console is not automatically displayed, it can be accessed at localhost:3000/.

DEBUGGING
=========

1.  Install the browser extension 'React developer tools'.

  1.  Edge <https://microsoftedge.microsoft.com/addons/detail/react-developer-tools/gpphkfbcpidddadnkolkpfckpihlkkil>

  2.  Chrome <https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi>

  3.  Firefox <https://addons.mozilla.org/en-US/firefox/addon/react-devtools/>

  4.  This browser plugin will install a new development console tab named 'Components'  (the development console is usually accessible via F12). The new 'Components' tab will show the react component hierarchy of the current page. This differs from the hierarchy displayed under the 'Elements'/'Inspector' tab in that the Elements tab displays the final HTML that the browser is rendering. The Components tab shows the React component hierarchy. This is extremely useful when trying to associate an area on the UI with the React component that is used to render it.

2.  To force the console to use various topologies, modify the data returned for the various REST endpoints. The file src/restService.js contains the code that makes the HTTPRequestXML calls. This code will determine if the console is running under the yarn development server or the yarn test suite and load the data from files located under public/data/. 

  If the console is not running under the development server or the test suite, restService.js will direct the request to the host:port that served the console. In production, this is the skupper site-controller.

3.  Turn off web page caching. The react development server (started when you do 'yarn start') will refresh the console's UI whenever a source file is changed. However, browsers may still use a cached version of the console instead of requesting a new page. To disable this behavior:

  1.  open the developer console with F12

  2.  Open the developer console's setting dialog

    1.  Click in the developer tools to give it focus

    1.  Press F1 to open the settings

  3.  Disable the cache

    1.  In Chrome this is named "Disable cache (while devTools is open)"

    2.  In Firefox this is named "Disable HTTP cache (when toolbox is open)"

TESTING
=======

<https://jestjs.io/docs/tutorial-react>. Testing uses a test framework named Jest. 

To run a self-test, run the command:

    $ yarn run test

Notes: 

Jest will automatically run only the tests for the components that have changed since Jest was last run. To run all the tests, press 'a' when Jest prompts for input.

Jest can produce a code coverage report. To view this report run:

    $ yarn run test --coverage

RELEASE
=======

To create the .gzip file of the skupper console for a release, run the following command in the console's root directory (the directory that contains the package.json file):

$ yarn run release

This command will create an optimized build in the build/ directory. It will then .gzip the contents of `build/` into the file console.tgz. This file can be uploaded to github under a release tag.

NOTABLE FILES
=============

public/index.html - This is the main container for the console. This is where you would change the page title and icon. The section `<div id="root"></div>` is populated by React with the contents of `src/App.js`. 

src/index.js - This is the first javascript file that runs when the app loads. This file simply renders the `<App />` component defined in `src/App.js`.

src/App.js - This is the top level container for the <App /> react component. It loads stylesheets and renders the Layout component defined in src/layout.js.

src/layout.js - This defines the Layout component. This is the container for all the sub components like the header, navigation, and individual page components. The Layout component ensures the user is authenticated before displaying a page component. If the user has not been authenticated, Layout renders the Connect component.

src/App.css - This contains styles that are shared across all components. Styles specific to a component are loaded from the .css file with the same name as the component (except with a .css extension instead of .js). Component specific styles are stored alongside the component.

src/assets - This directory contains non-static images and svgs that are loaded at runtime.

src/utilities - Contains general purpose functions.

SERVICE OBJECT
==============

For the skupper console, the service object provides access to the VAN's data. It is defined in the file `src/qdrService.js` and is accessible in each component using the variable `this.props.service`. The `<Layout />` component instantiates the service object and passes it to the sub components as a property.

The Layout component periodically refreshes the VAN data by calling `service.update()`. This makes the following REST calls

-   GET /DATA - the raw VAN data. Contains list of all sites, services in use at each site, and traffic data between services.

-   GET /site - returns the site id of the current site (the one serving the console)

-   GET /tokens - list of connection tokens

-   GET /links - list of site links (site links are created when you use a connection token)

-   GET /services - list of exposed and exposable services running on this site

After calling `service.update()`, the service object will then call the data adapter defined in `/src/adapter.js`. This parses the raw data and produces four arrays:

-   sites array - contains metadata about a site.

-   services array - contains metadata about a service (protocol, address, etc.)

-   deployments array - This is derived by the adapter from the sites and services arrays. A deployment is a service that has been exposed and is running at a specific site.

-   deploymentLinks array - This describes the traffic between deployments. Each deployment link has a source deployment, a target deployment, a request object that contains a current snapshot of the traffic between the source and target deployments, and a history of those snapshots. The 'Network', 'Services' and 'Deployments' views are built based on the deploymentLinks array.

VIEWS
=====

There are 4 views accessible via the skupper console's navigation menu (left side of page):

1.  Site - This is the site-linking / service exposing view. The components for these pages are stored under src/pages/siteInfo/.

2.  Network - Displays information about the connected skupper sites. The current site should always show up here. Other sites will appear only after a link has been established.

3.  Services - Shows a logical view of how the services are connected. A service will only show up here after traffic has been sent or received for that service.

4.  Deployments - Shows a view of how the services are connected and the sites in which the services reside. 

There is a single component responsible for the "Graph" mode under Network, Services, and Deployments. It is defined in `src/pages/topology/topologyViewer.js`. It uses the files under `src/pages/topology/views/` to determine how to fetch and display each view's data.

The component for the "List" views under Network, Services, and Deployments is defined in `src/pages/list/listPage.js`. The files under `src/pages/topology/views/` describe how to fetch and display the data for the view's table and sub-table.
