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
import { Tabs, Tab } from "@patternfly/react-core";
import Overview from "./overviewPage";
import Expose from "./exposePage";
import Tokens from "./tokensPage";
import LinkedSites from "./linkedSitesPage";
import { Alert, AlertActionCloseButton } from "@patternfly/react-core";
import { ALERT_TIMEOUT } from "../../qdrService";

class SiteInfoViewer extends React.Component {
  constructor(props) {
    super(props);
    let mode = this.props.mode || "Overview";
    if (mode === "info") {
      mode = "Overview";
    }
    this.state = {
      tab: mode,
      alerts: [],
    };
    this.tabRefs = {};
    this.tabs = {
      Overview: (
        <Overview
          {...this.props}
          view="site"
          ref={(el) => (this.tabRefs["Overview"] = el)}
        />
      ),
      Deployments: (
        <Expose
          {...this.props}
          ref={(el) => (this.tabRefs["Deployments"] = el)}
        />
      ),
      Tokens: (
        <Tokens {...this.props} ref={(el) => (this.tabRefs["Tokens"] = el)} />
      ),
      Links: (
        <LinkedSites
          {...this.props}
          ref={(el) => (this.tabRefs["Links"] = el)}
        />
      ),
    };
    if (!this.props.siteInfo.services) {
      delete this.tabs.Deployments;
    }
  }

  componentDidMount = () => {
    this.mounted = true;
    const options = {
      view: "thissite",
      mode: this.state.tab,
    };
    // change the browser's url to reflect the current view/mode
    this.props.setOptions(options, true);
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  componentDidUpdate = () => {};

  update = () => {
    const currentTabRef = this.tabRefs[this.state.tab];
    if (currentTabRef && currentTabRef.update) {
      currentTabRef.update();
    }
  };

  handleTabClick = (event, tabIndex) => {
    this.setState(
      {
        tab: tabIndex,
      },
      () => {
        if (this.props.handleChangeViewMode) {
          // remember that the user clicked on this tab
          this.props.handleChangeViewMode(tabIndex, true);
          const options = {
            view: "thissite",
            mode: tabIndex,
          };
          // change the url in the browser
          this.props.setOptions(options, true);
        }
      }
    );
  };

  doAddAlert = (alertProps) => {
    alertProps.key = new Date().getTime();
    this.setState({ alerts: [...this.state.alerts, alertProps] });
    if (this.props.forceUpdate) {
      this.props.forceUpdate();
    }
  };

  closeAlert = (event, alertKey) => {
    const { alerts } = this.state;
    this.setState({ alerts: alerts.filter((a) => a.key !== alertKey) });
  };

  render() {
    const { tab, alerts } = this.state;

    return (
      <Tabs
        activeKey={tab}
        mountOnEnter
        unmountOnExit
        isSecondary
        onSelect={this.handleTabClick}
        className="sk-thissite-tabs"
      >
        {Object.keys(this.tabs).map((t) => (
          <Tab eventKey={t} title={t} key={t} className="sk-siteinfo-tab">
            {alerts.map(
              ({
                title,
                variant,
                isLiveRegion,
                ariaLive,
                ariaRelevant,
                ariaAtomic,
                key,
              }) => (
                <Alert
                  className="sk-alert"
                  variant={variant}
                  title={title}
                  timeout={ALERT_TIMEOUT}
                  isLiveRegion={isLiveRegion}
                  isInline
                  aria-live={ariaLive}
                  aria-relevant={ariaRelevant}
                  aria-atomic={ariaAtomic}
                  key={key}
                  actionClose={
                    <AlertActionCloseButton
                      onClose={(event) => this.closeAlert(event, key)}
                    />
                  }
                />
              )
            )}

            {this.tabs[t]}
          </Tab>
        ))}
      </Tabs>
    );
  }
}

export default SiteInfoViewer;
