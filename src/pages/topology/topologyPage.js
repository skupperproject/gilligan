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

import React, { Component } from "react";
import {
  PageSection,
  PageSectionVariants,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from "@patternfly/react-core";
import { Split, SplitItem } from "@patternfly/react-core";
import TopologyViewer from "./topologyViewer";
import NavDropdown from "../../navDropdown";
import { Icap, getSaved, setSaved, copy } from "../../utilities";
import LastUpdated from "../../lastUpdated";
const TOOLBAR_CHECKS = "tbChecks";

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropDownOpen: false,
      options: {
        link: { stat: "bytes_out" },
      },
    };
    const defaultChecks = {
      sankey: false,
      stat: false,
      width: false,
      color: true,
    };
    this.checks = getSaved(TOOLBAR_CHECKS, {
      service: copy(defaultChecks),
      site: copy(defaultChecks),
      deployment: copy(defaultChecks),
    });
  }

  handleChangeOption = (option) => {
    const { options } = this.state;
    options.link.stat = option;
    this.setState({ options }, () => {
      this.graphRef.restart();
    });
  };

  handleChangeLastUpdated = () => {
    this.updatedRef.update();
  };

  saveChecks = () => {
    setSaved(TOOLBAR_CHECKS, this.checks);
  };
  handleChangeShowStat = (showStat) => {
    this.checks[this.props.view].stat = showStat;
    this.saveChecks();
  };
  handleChangeSankey = (showSankey) => {
    this.checks[this.props.view].sankey = showSankey;
    this.showSankey = showSankey;
    this.saveChecks();
  };
  handleChangeWidth = (showWidth) => {
    this.checks[this.props.view].width = showWidth;
    this.checks[this.props.view].color = !showWidth;
    this.saveChecks();
  };
  handleChangeColor = (showColor) => {
    this.checks[this.props.view].color = showColor;
    this.checks[this.props.view].width = !showColor;
    this.saveChecks();
  };
  getShowStat = () => {
    return this.checks[this.props.view].stat;
  };
  getShowSankey = () => {
    return this.checks[this.props.view].sankey;
  };
  getShowWidth = () => {
    return this.checks[this.props.view].width;
  };
  getShowColor = () => {
    return this.checks[this.props.view].color;
  };

  update = () => {
    this.graphRef.update();
    this.handleChangeLastUpdated();
  };

  render() {
    return (
      <PageSection
        variant={PageSectionVariants.light}
        className="topology-page"
      >
        <Stack>
          <StackItem className="overview-header">
            <Split gutter="md">
              <SplitItem>
                <TextContent>
                  <Text className="overview-title" component={TextVariants.h1}>
                    {Icap(this.props.view)}s
                  </Text>
                </TextContent>
              </SplitItem>
              <SplitItem isFilled>
                View
                <NavDropdown
                  view={this.props.view}
                  viewType="graph"
                  handleChangeViewType={this.props.handleChangeViewType}
                />
              </SplitItem>
              <SplitItem>
                <TextContent>
                  <LastUpdated ref={(el) => (this.updatedRef = el)} />
                </TextContent>
              </SplitItem>
            </Split>
          </StackItem>
          <StackItem className="overview-table">
            <TopologyViewer
              ref={(el) => (this.graphRef = el)}
              service={this.props.service}
              view={this.props.view}
              options={this.state.options}
              handleChangeView={this.handleChangeView}
              handleChangeOption={this.handleChangeOption}
              getShowStat={this.getShowStat}
              getShowSankey={this.getShowSankey}
              getShowWidth={this.getShowWidth}
              getShowColor={this.getShowColor}
              handleChangeSankey={this.handleChangeSankey}
              handleChangeWidth={this.handleChangeWidth}
              handleChangeColor={this.handleChangeColor}
              handleChangeShowStat={this.handleChangeShowStat}
              handleChangeViewType={this.props.handleChangeViewType}
              handleChangeLastUpdated={this.handleChangeLastUpdated}
            />
          </StackItem>
        </Stack>
      </PageSection>
    );
  }
}

export default TopologyPage;
