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

import {
  HashRouter as Router,
  Switch,
  Route,
  Link,
  Redirect,
} from "react-router-dom";

import accessibleStyles from "@patternfly/patternfly/utilities/Accessibility/accessibility.css";
import { css } from "@patternfly/react-styles";
import { BellIcon } from "@patternfly/react-icons";
import ConnectPage from "./pages/connect/connectPage";
import TopologyPage from "./pages/topology/topologyPage";
import TablePage from "./pages/table/tablePage";
import ListPage from "./pages/list/listPage";
import { QDRService } from "./qdrService";
import { getSaved, setSaved } from "./utilities";
const gilliganImg = require("./assets/skupper.svg");
const avatarImg = require("./assets/img_avatar.svg");

const UPDATE_INTERVAL = 2000;
const TOOLBAR_CHECKS = "toolbarChecks";
const VIEW_TYPE = "viewType";
const LAST_VIEW = "lastView2";
const LAST_GROUP = "lastGroup";

class PageLayout extends React.Component {
  constructor(props) {
    super(props);
    const viewType = getSaved(VIEW_TYPE, "");
    this.lastView = `${getSaved(LAST_VIEW, "service")}${viewType}`;
    this.state = {
      connected: false,
      connectPath: "",
      activeItem: this.lastView,
      username: "",
    };
    this.hooks = { setLocation: this.setLocation };
    this.service = new QDRService(this.hooks);

    this.views = [
      { name: "Services", view: "service" },
      { name: "Sites", view: "site" },
      { name: "Deployments", view: "deployment" },
      //{ name: "Processes", view: "process" },
    ];
    const checks = getSaved(TOOLBAR_CHECKS, {
      sankey: false,
      stat: false,
      width: false,
      color: true,
    });
    //checks.sankey = true;
    this.showSankey = checks.sankey;
    this.showStat = checks.stat;
    this.showWidth = checks.width;
    this.showColor = checks.color;
  }

  componentDidMount = () => {
    this.doConnect();
  };

  componentWillUnmount = () => {
    clearInterval(this.timer);
    this.unmounted = true;
  };
  setLocation = (where) => {
    //this.setState({ connectPath: where })
  };

  update = () => {
    this.service.update().then((data) => {
      if (!this.unmounted) {
        if (this.pageRef && this.pageRef.update) {
          this.pageRef.update();
        }
      }
    });
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
      if (
        connectPath === undefined ||
        connectPath === "/" ||
        connectPath === "/login"
      )
        connectPath = `/${this.lastView}`;
      const activeItem = connectPath.split("/").pop();
      this.props.history.replace(connectPath);
      clearInterval(this.timer);
      this.timer = setInterval(this.update, UPDATE_INTERVAL);
      this.setState({
        username: "Bob Denver",
        activeItem,
        connectPath,
        connected: true,
      });
    }
  };

  onNavSelect = (result) => {
    this.lastView = result.itemId;
    this.lastGroup = result.groupId;
    setSaved(LAST_VIEW, this.lastView);
    setSaved(LAST_GROUP, this.lastGroup);
    this.setState({
      activeItem: result.itemId,
      connectPath: "",
    });
  };

  saveChecks = () => {
    setSaved(TOOLBAR_CHECKS, {
      sankey: this.showSankey,
      stat: this.showStat,
      width: this.showWidth,
      color: this.showColor,
    });
  };
  handleChangeViewType = (viewType) => {
    setSaved(VIEW_TYPE, viewType);
  };
  handleChangeShowStat = (showStat) => {
    this.showStat = showStat;
    this.saveChecks();
  };
  handleChangeSankey = (showSankey) => {
    this.showSankey = showSankey;
    this.saveChecks();
  };
  handleChangeWidth = (showWidth) => {
    this.showWidth = showWidth;
    this.showColor = !showWidth;
    this.saveChecks();
  };
  handleChangeColor = (showColor) => {
    this.showColor = showColor;
    this.showWidth = !showColor;
    this.saveChecks();
  };
  getShowStat = () => {
    return this.showStat;
  };
  getShowSankey = () => {
    return this.showSankey;
  };
  getShowWidth = () => {
    return this.showWidth;
  };
  getShowColor = () => {
    return this.showColor;
  };

  toL = (s) => s[0].toLowerCase() + s.slice(1);

  render() {
    const { activeItem } = this.state;

    const PageNav = () => {
      return (
        <Nav onSelect={this.onNavSelect} theme="dark" className="pf-m-dark">
          <NavList>
            {this.views.map((viewInfo) => {
              const { view, name } = viewInfo;
              return (
                <NavItem
                  id={`${name}NavItem`}
                  itemId={view}
                  isActive={
                    activeItem === view || activeItem === `${view}Table`
                  }
                  key={view}
                >
                  <Link to={`/${view}`}>{name}</Link>
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
            <Brand src={gilliganImg} alt="Gilligan Logo" />
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

    // don't allow access to this component unless we are logged in
    const PrivateRoute = ({ component: Component, path: rpath, ...more }) => (
      <Route
        path={rpath}
        {...(more.exact ? "exact" : "")}
        render={(props) =>
          this.state.connected ? (
            <Component
              ref={(el) => (this.pageRef = el)}
              service={this.service}
              {...props}
              {...more}
              getShowStat={() => this.showStat}
              getShowSankey={() => this.showSankey}
              getShowWidth={() => this.showWidth}
              getShowColor={() => this.showColor}
              handleChangeSankey={this.handleChangeSankey}
              handleChangeWidth={this.handleChangeWidth}
              handleChangeColor={this.handleChangeColor}
              handleChangeShowStat={this.handleChangeShowStat}
              handleChangeViewType={this.handleChangeViewType}
            />
          ) : (
            <Redirect
              to={{
                pathname: "/login",
                state: {
                  from: props.location,
                  connected: this.state.connected,
                },
              }}
            />
          )
        }
      />
    );

    // When we need to display a different component(page),
    // we render a <Redirect> object
    const redirectAfterConnect = () => {
      let { connectPath } = this.state;
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
        >
          <Switch>
            <PrivateRoute
              path="/"
              exact
              component={TopologyPage}
              view="service"
            />
            <PrivateRoute
              path="/service"
              component={TopologyPage}
              view="service"
            />
            <PrivateRoute
              path="/serviceTable"
              component={TablePage}
              view="service"
            />
            <PrivateRoute path="/site" component={TopologyPage} view="site" />
            <PrivateRoute path="/siteTable" component={TablePage} view="site" />
            <PrivateRoute
              path="/deployment"
              component={TopologyPage}
              view="deployment"
            />
            <PrivateRoute
              path="/deploymentTable"
              component={TablePage}
              view="deployment"
            />
            <PrivateRoute path="/process" component={ListPage} />
            <Route
              path="/login"
              render={(props) => (
                <ConnectPage
                  {...props}
                  service={this.service}
                  handleConnect={this.handleConnect}
                  isConnected={this.state.connected}
                />
              )}
            />
          </Switch>
        </Page>
      </Router>
    );
  }
}

export default PageLayout;
