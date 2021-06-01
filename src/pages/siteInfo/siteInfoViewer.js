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

class SiteInfoViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: "Overview",
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
      Services: (
        <Expose {...this.props} ref={(el) => (this.tabRefs["Services"] = el)} />
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
  }

  componentDidMount = () => {
    this.mounted = true;
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
    this.setState({
      tab: tabIndex,
    });
  };
  render() {
    const { tab } = this.state;

    return (
      <Tabs
        activeKey={tab}
        isSecondary
        onSelect={this.handleTabClick}
        className="sk-thissite-tabs"
      >
        {Object.keys(this.tabs).map((t) => (
          <Tab eventKey={t} title={t} key={t} className="sk-siteinfo-tab">
            {this.tabs[t]}
          </Tab>
        ))}
      </Tabs>
    );
  }
}

export default SiteInfoViewer;