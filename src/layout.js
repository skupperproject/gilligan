/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

import React from "react";
import {
  Brand,
  Button,
  ButtonVariant,
  Page,
  PageHeader,
  SkipToContent,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  PageSidebar,
} from "@patternfly/react-core";

import { Nav, NavItem, NavList } from "@patternfly/react-core";

import { BrowserRouter as Router, Redirect } from "react-router-dom";
import { createBrowserHistory } from "history";
import accessibleStyles from "@patternfly/patternfly/utilities/Accessibility/accessibility.css";
import { css } from "@patternfly/react-styles";
import { BellIcon } from "@patternfly/react-icons";
import ConnectPage from "./pages/connect/connectPage";
import TopologyPage from "./pages/topology/topologyPage";
import TablePage from "./pages/table/tablePage";
import SiteInfoPage from "./pages/siteInfo/siteInfoPage";
import ErrorPage from "./pages/connect/errorPage";
import { QDRService, UPDATE_INTERVAL } from "./qdrService";
import { utils } from "./utilities";
import gilliganImg from "./assets/skupper.svg";
import "./layout.css";
const history = createBrowserHistory();
const VIEW_MODES = "viewModes";
const LAST_VIEW = "lastView2";
const CONNECT_TIMEOUT = 10 * 1000;

class Layout extends React.Component {
  constructor(props) {
    super(props);
    const view = utils.getSaved(LAST_VIEW, "service");
    // view modes are "graph", "table", "details", and "Overview"
    this.viewModes = utils.getSaved(VIEW_MODES, {
      thissite: "Overview",
      service: "graph",
      site: "graph",
      deployment: "graph",
    });
    // added in version 1.5 so it won't be in the data that was saved before that
    if (!this.viewModes.thissite) {
      this.viewModes.thissite = "Overview";
    }
    // never start with the details view
    if (this.viewModes[view] === "details") {
      this.viewModes[view] = view === "thissite" ? "Overview" : "table";
    }
    this.setCorrectMode(view, this.viewModes[view]);
    // setup the last mode the user picked
    this.savedMode = null;
    this.state = {
      connected: false,
      connectPath: "",
      username: "",
      view,
      mode: this.viewModes[view],
      connectionError: null,
      connectionTimedout: false,
    };
    this.hooks = { setLocation: this.setLocation };
    this.service = new QDRService(this.hooks);

    this.views = {
      thissite: "Site",
      site: "Network",
      service: "Services",
      deployment: "Deployments",
    };
  }
  componentDidMount = () => {
    this.doConnect();
    // avoid unresponsive page by reloading after 1 hour of inactivity
    this.clearIdle = utils.idle(1000 * 60 * 60, this.handleIdleTimeout);
  };

  componentWillUnmount = () => {
    clearInterval(this.timer);
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
    }
    this.clearIdle();
    this.unmounted = true;
  };

  componentDidUpdate = () => {
    const { options } = utils.viewFromHash();
    // a new URL was pasted into the browser's address bar.
    // go to the new view and use its parameters
    if (this.navSelect !== "userChanged" && !utils.isEmpty(options)) {
      const view = options.view || "thissite";
      const mode = options.mode || view === "thissite" ? "Overview" : "graph";
      // save the new options for the new view
      utils.overrideOptions(view, options);
      this.viewModes[view] = mode;
      utils.setSaved(VIEW_MODES, this.viewModes);
      // tell the current view to update
      this.setState({ view, mode }, () => {
        // prevent infinite loop if user hits back button
        this.navSelect = "userChanged";
      });
    }
    this.navSelect = undefined;
  };

  handleChangeViewMode = (mode, save = true) => {
    this.viewModes[this.state.view] = mode;
    this.navSelect = "userChanged";
    if (save) {
      utils.setSaved(VIEW_MODES, this.viewModes);
    }
    this.setState({ mode });
  };

  // called internally when clicking on a service/site/deployment to view the details page
  handleViewDetails = (mode, d, card, origin = "graph") => {
    let view = this.state.view;
    if (d.nodeType === "cluster") {
      // we want to see the details for a site
      view = "site";
    }
    // if we are on the overview page and want to see the details table, switch to the appropriate view, details mode
    if (origin === "overview") {
      if (card.cardType === "service") {
        view = "service";
      } else if (card.cardType === "deployment") {
        view = "deployment";
      } else {
        view = "site";
      }
    }
    this.savedMode = this.viewModes[view];
    this.viewModes[view] = mode;
    this.navSelect = "userChanged";
    this.setState({ view, mode }, () => {
      this.pageRef.handleShowSubTable(origin, d, card);
    });
  };

  setCorrectMode = (view, mode) => {
    if (view !== "thissite" && mode !== "table" && mode !== "graph") {
      this.viewModes[view] = "graph";
      mode = this.viewModes[view];
    }
    return mode;
  };
  // user clicked on a nav item to go to a view
  onNavSelect = (result) => {
    let { mode } = this.state;
    const { view } = this.state;

    this.navSelect = "userChanged";
    utils.setSaved(LAST_VIEW, result.itemId);

    // restore the last mode the user selected
    if (this.savedMode) {
      this.viewModes[view] = this.savedMode;
      this.savedMode = null;
    }
    mode = this.setCorrectMode(view, mode);
    utils.setSaved(VIEW_MODES, this.viewModes);

    // when clicking on a nav item, go to the table view instead of the details view
    if (this.viewModes[result.itemId] === "details") {
      this.viewModes[result.itemId] = "table";
    }
    this.setState({
      view: result.itemId,
      mode,
      connectPath: "",
    });
  };

  setOptions = (options, user) => {
    if (user) this.navSelect = "userChanged";
    if (!utils.isEmpty(options)) {
      options.mode = this.getMode();
      const newHash = Object.keys(options)
        .map((key) => {
          return `${key}=${options[key]}`;
        })
        .join("&");
      history.push(`#${newHash}`);
    } else {
      history.replace("");
    }
  };

  setLocation = (where) => {
    //this.setState({ connectPath: where })
  };

  handleIdleTimeout = () => {
    this.props.history.replace(
      `${this.props.location.pathname}${this.props.location.search}`
    );
  };

  // called from setInterval to update the DATA
  update = () => {
    if (this.updating) {
      console.log(
        `updating took longer than ${
          UPDATE_INTERVAL / 1000
        } seconds. Skipping this update`
      );
      return;
    }
    this.updating = true;
    this.service.update().then(
      (data) => {
        if (!this.unmounted) {
          if (this.pageRef?.update) {
            this.pageRef.update();
          }
        }
        this.updating = false;
      },
      (e) => {
        this.updating = false;
        console.log("error during update");
        console.log(e);
      }
    );
  };

  forceUpdate = () => {
    this.updating = false;
    this.update();
  };

  doConnect = () => {
    this.connectTimer = setTimeout(this.connectTimeout, CONNECT_TIMEOUT);
    this.service.connect().then(
      (r) => {
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        } else {
          // we got a response after the connection timer
        }
        this.handleConnect(this.props.fromPath, true);
      },
      (e) => {
        clearTimeout(this.connectTimer);
        this.connectTimer = null;
        this.setState({ connectionError: e.message });
        console.log(e);
      }
    );
  };

  connectTimeout = () => {
    this.setState({ connectionTimedout: true });
  };

  handleTryAgain = () => {
    this.setState({ connectionTimedout: false, connectionError: null }, () => {
      this.doConnect();
    });
  };
  handleConnect = (connectPath) => {
    if (this.state.connected) {
      this.setState({ connected: false }, () => {
        this.handleConnectCancel();
        this.service.disconnect();
      });
    } else {
      connectPath = "/";
      clearInterval(this.timer);
      this.timer = setInterval(this.update, UPDATE_INTERVAL * 2);
      if (!this.unmounted) {
        this.setState({
          username: "Bob Denver",
          connectPath,
          connected: true,
        });
      }
    }
  };

  toL = (s) => s[0].toLowerCase() + s.slice(1);

  getMode = () => this.viewModes[this.state.view];

  render() {
    const { view } = this.state;
    const mode = this.getMode();
    //console.log(`layout::render view ${view} mode ${mode}`);
    const PageNav = () => {
      return (
        <Nav onSelect={this.onNavSelect} theme="dark" className="pf-m-dark">
          <NavList>
            {Object.keys(this.views).map((viewKey) => {
              return (
                <NavItem
                  id={`${viewKey}NavItem`}
                  itemId={viewKey}
                  isActive={viewKey === view}
                  key={viewKey}
                >
                  <div className="nav-item-link">{this.views[viewKey]}</div>
                </NavItem>
              );
            })}
          </NavList>
        </Nav>
      );
    };
    const PageToolbar = (
      <Toolbar>
        <ToolbarGroup
          className={css(
            accessibleStyles.screenReader,
            accessibleStyles.visibleOnLg
          )}
        >
          <ToolbarItem>
            <Button
              id="default-example-uid-01"
              aria-label="Notifications actions"
              variant={ButtonVariant.plain}
            >
              <BellIcon />
            </Button>
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    );

    const Header = (
      <PageHeader
        className="topology-header"
        logo={
          <React.Fragment>
            <Brand
              src={gilliganImg}
              alt="Gilligan Logo"
              className="sk-gilligan-logo"
            />
            <span id="skupper-logo">Skupper</span>
          </React.Fragment>
        }
        toolbar={PageToolbar}
        showNavToggle
      />
    );
    const pageId = "main-content-page-layout-expandable-nav";
    const PageSkipToContent = (
      <SkipToContent href={`#${pageId}`}>Skip to Content</SkipToContent>
    );

    const sidebar = (PageNav) => {
      if (this.state.connected) {
        return (
          <PageSidebar nav={PageNav()} theme="dark" className="pf-m-dark" />
        );
      }
      return <React.Fragment />;
    };

    // When we need to display a different component(page),
    // we render a <Redirect> object
    const redirectAfterConnect = () => {
      let connectPath = this.state.connectPath;
      if (connectPath === "/login") connectPath = "/";
      if (connectPath !== "") {
        return <Redirect to={connectPath} />;
      }
      return <React.Fragment />;
    };
    return (
      <Router>
        {redirectAfterConnect()}
        <Page
          header={Header}
          sidebar={sidebar(PageNav)}
          isManagedSidebar
          skipToContent={PageSkipToContent}
          className={"skupper-console"}
        >
          {!this.state.connected && this.state.connectionTimedout && (
            <ErrorPage
              {...this.props}
              service={this.service}
              handleTryAgain={this.handleTryAgain}
              error="The request to fetch the data has timed out."
              title="Timed out"
            />
          )}
          {!this.state.connected && this.state.connectionError && (
            <ErrorPage
              {...this.props}
              service={this.service}
              handleTryAgain={this.handleTryAgain}
              error={this.state.connectionError}
              title="Connection error"
            />
          )}
          {!this.state.connected &&
            !this.state.connectionError &&
            !this.state.connectionTimedout && (
              <ConnectPage
                {...this.props}
                service={this.service}
                handleConnect={this.handleConnect}
                isConnected={false}
              />
            )}
          {this.state.connected && mode === "graph" && (
            <TopologyPage
              ref={(el) => (this.pageRef = el)}
              service={this.service}
              {...this.props}
              handleChangeViewMode={this.handleChangeViewMode}
              handleViewDetails={this.handleViewDetails}
              forceUpdate={this.forceUpdate}
              setOptions={this.setOptions}
              view={this.state.view}
              views={this.views}
              mode="graph"
            />
          )}
          {this.state.connected && (mode === "table" || mode === "details") && (
            <TablePage
              ref={(el) => (this.pageRef = el)}
              service={this.service}
              {...this.props}
              handleChangeViewMode={this.handleChangeViewMode}
              forceUpdate={this.forceUpdate}
              setOptions={this.setOptions}
              view={this.state.view}
              views={this.views}
              mode={mode}
              origin={this.state.origin}
            />
          )}
          {this.state.connected && view === "thissite" && (
            <SiteInfoPage
              ref={(el) => (this.pageRef = el)}
              service={this.service}
              {...this.props}
              mode={mode}
              handleViewDetails={this.handleViewDetails}
              handleChangeViewMode={this.handleChangeViewMode}
              forceUpdate={this.forceUpdate}
              setOptions={this.setOptions}
            />
          )}
        </Page>
      </Router>
    );
  }
}

export default Layout;
