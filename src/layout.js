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
  Button,
  ButtonVariant,
  Dropdown,
  DropdownToggle,
  DropdownItem,
  Page,
  PageHeader,
  SkipToContent,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  Nav,
  NavItem,
  NavList,
  PageSidebar
} from "@patternfly/react-core";

import {
  BrowserRouter as Router,
  Link,
  Switch,
  Route,
  Redirect
} from "react-router-dom";

import accessibleStyles from "@patternfly/patternfly/utilities/Accessibility/accessibility.css";
import { css } from "@patternfly/react-styles";
import { BellIcon, PowerOffIcon } from "@patternfly/react-icons";
import ConnectPage from "./connectPage";
import TopologyPage from "./topology/topologyPage";
import MessageFlowPage from "./chord/qdrChord";
import { QDRService } from "./qdrService";
import ConnectForm from "./connect-form";
const avatarImg = require("./assets/img_avatar.svg");

class PageLayout extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      connected: false,
      connectPath: "",
      isDropdownOpen: false,
      activeItem: "network",
      isConnectFormOpen: false,
      username: ""
    };
    this.hooks = { setLocation: this.setLocation };
    this.service = new QDRService(this.hooks);
    this.views = ["Network", "Application", "Service", "Address", "Reality"];
  }

  setLocation = where => {
    //this.setState({ connectPath: where })
  };

  onDropdownToggle = isDropdownOpen => {
    this.setState({
      isDropdownOpen
    });
  };

  onDropdownSelect = event => {
    this.setState({
      isDropdownOpen: !this.state.isDropdownOpen
    });
  };

  handleConnect = (connectPath, connected) => {
    if (!connected) {
      this.setState({
        connected: false
      });
    } else {
      if (
        connectPath === undefined ||
        connectPath === "/login" ||
        connectPath === "/"
      )
        connectPath = "/network";
      this.setState({
        connected: true,
        connectPath,
        username: "Alan Hale Jr.",
        activeItem: connectPath.slice(1)
      });
    }
  };

  onNavSelect = result => {
    this.setState({
      activeItem: result.itemId,
      connectPath: ""
    });
  };
  icap = s => s.charAt(0).toUpperCase() + s.slice(1);

  toggleConnectForm = event => {
    this.setState({ isConnectFormOpen: !this.state.isConnectFormOpen });
  };

  handleConnectCancel = () => {
    this.setState({ isConnectFormOpen: false });
  };

  toL = s => s[0].toLowerCase() + s.slice(1);

  render() {
    const { isDropdownOpen, activeItem } = this.state;

    const PageNav = () => {
      return (
        <Nav onSelect={this.onNavSelect} theme="dark" className="pf-m-dark">
          <NavList>
            {this.views.map(V => {
              const v = this.toL(V);
              return (
                <NavItem
                  id={`${V}NavItem`}
                  itemId={v}
                  isActive={activeItem === v}
                  key={v}
                >
                  <Link to={`/${v}`}>{V}</Link>
                </NavItem>
              );
            })}
          </NavList>
        </Nav>
      );
    };
    const userDropdownItems = [
      <DropdownItem component="button" key="action">
        Logout
      </DropdownItem>
    ];
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
              id="connectButton"
              onClick={this.toggleConnectForm}
              aria-label="Toggle Connect Form"
              variant={ButtonVariant.plain}
            >
              <PowerOffIcon />
            </Button>
          </ToolbarItem>
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
        <ToolbarGroup>
          <ToolbarItem
            className={css(
              accessibleStyles.screenReader,
              accessibleStyles.visibleOnMd
            )}
          >
            <Dropdown
              isPlain
              position="right"
              onSelect={this.onDropdownSelect}
              isOpen={isDropdownOpen}
              toggle={
                <DropdownToggle onToggle={this.onDropdownToggle}>
                  {this.state.username}
                </DropdownToggle>
              }
              dropdownItems={userDropdownItems}
            />
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    );

    const Header = (
      <PageHeader
        className="topology-header"
        logo={
          <span className="logo-text">
            Skipper - A tool to visualize a Skupper network
          </span>
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

    const sidebar = PageNav => {
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
        render={props =>
          this.state.connected ? (
            <Component service={this.service} {...props} {...more} />
          ) : (
            <Redirect
              to={{
                pathname: "/login",
                state: {
                  from: props.location,
                  connected: this.state.connected
                }
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
      if (connectPath === "/login") connectPath = "/network";
      if (connectPath !== "") {
        return <Redirect to={connectPath} />;
      }
      return <React.Fragment />;
    };

    const connectForm = () => {
      if (this.state.isConnectFormOpen) {
        return (
          <ConnectForm
            handleConnect={this.handleConnect}
            handleConnectCancel={this.handleConnectCancel}
            service={this.service}
            isConnected={this.state.connected}
          />
        );
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
          {connectForm()}
          <Switch>
            <PrivateRoute path="/" exact component={TopologyPage} />
            <PrivateRoute
              path="/network"
              type="network"
              component={TopologyPage}
            />
            <PrivateRoute
              path="/application"
              type="application"
              component={TopologyPage}
            />
            <PrivateRoute
              path="/service"
              type="service"
              component={TopologyPage}
            />
            <PrivateRoute
              path="/address"
              type="address"
              component={MessageFlowPage}
            />
            <PrivateRoute
              path="/reality"
              type="reality"
              component={TopologyPage}
            />
            <Route
              path="/login"
              render={props => (
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
