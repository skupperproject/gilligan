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
  Avatar,
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
import { QDRService } from "./qdrService";
import {
  getSaved,
  setSaved,
  idle,
  viewFromHash,
  isEmpty,
  overrideOptions,
} from "./utilities";
const gilliganImg = require("./assets/skupper.svg");
const avatarImg = require("./assets/img_avatar.svg");
const history = createBrowserHistory();
const UPDATE_INTERVAL = 2000;
const VIEW_MODES = "viewModes";
const LAST_VIEW = "lastView2";

class PageLayout extends React.Component {
  constructor(props) {
    super(props);
    const view = getSaved(LAST_VIEW, "service");
    this.viewModes = getSaved(VIEW_MODES, {
      service: "graph",
      site: "graph",
      deployment: "graph",
    });
    this.state = {
      connected: false,
      connectPath: "",
      view,
      username: "",
      mode: this.viewModes[view],
    };
    this.hooks = { setLocation: this.setLocation };
    this.service = new QDRService(this.hooks);

    this.views = [
      { description: "Services", name: "service" },
      { description: "Sites", name: "site" },
      { description: "Deployments", name: "deployment" },
      //{ name: "Processes", view: "process" },
    ];
  }
  componentDidMount = () => {
    this.doConnect();
    // avoid unresponsive page by reloading after 1 hour of inactivity
    this.clearIdle = idle(1000 * 60 * 60, this.handleIdleTimeout);
  };

  componentWillUnmount = () => {
    clearInterval(this.timer);
    this.clearIdle();
    this.unmounted = true;
  };

  componentDidUpdate = () => {
    const { options } = viewFromHash();
    // a new URL was pasted into the browser's address bar.
    // go to the new view and use its parameters
    if (this.navSelect !== "userChanged" && !isEmpty(options)) {
      const view = options.view || "service";
      const mode = options.mode || "graph";
      // save the new options for the new view
      overrideOptions(view, options);
      this.viewModes[view] = mode;
      setSaved(VIEW_MODES, this.viewModes);
      // tell the current view to update
      this.setState({ view, mode });
    }
    this.navSelect = undefined;
  };

  setOptions = (options, user) => {
    if (user) this.navSelect = "userChanged";
    if (!isEmpty(options)) {
      options.mode = this.getMode();
      const newHash = Object.keys(options)
        .map((key) => {
          return `${key}=${options[key]}`;
        })
        .join("&");
      history.replace(`#${newHash}`);
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

  update = () => {
    if (this.updating) {
      console.log(
        `updating took longer than ${UPDATE_INTERVAL /
          1000} seconds. Skipping this update`
      );
      return;
    }
    this.updating = true;
    this.service.update().then(
      (data) => {
        if (!this.unmounted) {
          if (this.pageRef && this.pageRef.update) {
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

  doConnect = () => {
    this.service.connect().then(
      (r) => {
        this.handleConnect(this.props.fromPath, true);
      },
      (e) => {
        console.log(e);
      }
    );
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
      this.timer = setInterval(this.update, UPDATE_INTERVAL);
      this.setState({
        username: "Bob Denver",
        connectPath,
        connected: true,
      });
    }
  };

  onNavSelect = (result) => {
    this.navSelect = "userChanged";
    setSaved(LAST_VIEW, result.itemId);
    this.setState({
      view: result.itemId,
      connectPath: "",
    });
  };

  handleChangeViewType = (mode) => {
    this.viewModes[this.state.view] = mode;
    this.navSelect = "userChanged";
    setSaved(VIEW_MODES, this.viewModes);
    this.setState({ mode });
  };

  toL = (s) => s[0].toLowerCase() + s.slice(1);

  getMode = () => {
    let mode = this.viewModes[this.state.view];
    return mode;
  };

  render() {
    const { view } = this.state;
    const PageNav = () => {
      return (
        <Nav onSelect={this.onNavSelect} theme="dark" className="pf-m-dark">
          <NavList>
            {this.views.map((viewInfo) => {
              const { description, name } = viewInfo;
              return (
                <NavItem
                  id={`${name}NavItem`}
                  itemId={name}
                  isActive={name === view}
                  key={name}
                >
                  <div className="nav-item-link">{description}</div>
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
            <span className="logo-text">Skupper</span>
          </React.Fragment>
        }
        toolbar={PageToolbar}
        avatar={<Avatar src={avatarImg} alt="Avatar image" />}
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
          {!this.state.connected && (
            <ConnectPage
              {...this.props}
              service={this.service}
              handleConnect={this.handleConnect}
              isConnected={false}
            />
          )}
          {this.state.connected && (
            <TopologyPage
              ref={(el) => (this.pageRef = el)}
              service={this.service}
              {...this.props}
              handleChangeViewType={this.handleChangeViewType}
              setOptions={this.setOptions}
              view={this.state.view}
              mode={this.getMode()}
            />
          )}
        </Page>
      </Router>
    );
  }
}

export default PageLayout;
