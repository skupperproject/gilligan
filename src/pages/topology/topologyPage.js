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
import TableViewer from "../table/tableViewer";
import SubTable from "../table/subTable";
import NavDropdown from "../../navDropdown";
import { Icap } from "../../utilities";
import LastUpdated from "../../lastUpdated";

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropDownOpen: false,
      showSubPage: this.props.mode === "details",
      subPageInfo: {},
    };
    //console.log(`TOPOLOGYPAGE mode ${this.props.mode}`);
    //console.log(this.props);
  }

  handleChangeLastUpdated = () => {
    if (this.updatedRef) this.updatedRef.update();
  };

  update = () => {
    if (this.props.mode === "graph") {
      this.graphRef.update();
    } else if (this.props.mode === "details") {
      this.subTableRef.update();
    } else {
      this.tableRef.update();
    }
    this.handleChangeLastUpdated();
  };

  handleOverrideOptions = (newOptions) => {
    if (this.graphRef && this.graphRef.handleOverrideOptions)
      this.graphRef.handleOverrideOptions(newOptions);
  };

  handleShowSubTable = (show, subPageInfo) => {
    console.log(`showing details for `);
    console.log(subPageInfo);
    const options = {};
    options.item = subPageInfo.value;
    options.view = this.props.view;
    options.mode = "details";

    this.props.setOptions(options, true);
    this.props.handleChangeViewType("details");
    /*
    this.props.history.replace(
      `/${this.props.view}Details?item=${subPageInfo.value}`
    );*/
    //this.setState({ showSubPage: show, subPageInfo });
  };

  render() {
    return (
      <PageSection
        variant={PageSectionVariants.light}
        className="topology-page"
      >
        <Stack>
          {this.props.mode === "graph" && (
            <React.Fragment>
              <StackItem className="overview-header">
                <Split gutter="md">
                  <SplitItem>
                    <TextContent>
                      <Text
                        className="overview-title"
                        component={TextVariants.p}
                      >
                        {Icap(this.props.view)}s
                      </Text>
                    </TextContent>
                  </SplitItem>
                  <SplitItem isFilled className="sk-dropdown-prompt">
                    View
                    <NavDropdown
                      view={this.props.view}
                      mode={this.props.mode}
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
                  handleChangeView={this.handleChangeView}
                  handleChangeLastUpdated={this.handleChangeLastUpdated}
                  history={this.props.history}
                  setOptions={this.props.setOptions}
                />
              </StackItem>
            </React.Fragment>
          )}
          {this.props.mode === "details" && (
            <SubTable
              ref={(el) => (this.subTableRef = el)}
              service={this.props.service}
              view={this.props.view}
              info={this.state.subPageInfo}
              history={this.props.history}
              handleChangeViewType={this.props.handleChangeViewType}
              setOptions={this.props.setOptions}
            />
          )}
          {this.props.mode === "table" && (
            <React.Fragment>
              <StackItem className="overview-header">
                <Split gutter="md">
                  <SplitItem>
                    <TextContent>
                      <Text
                        className="overview-title"
                        component={TextVariants.h1}
                      >
                        {Icap(this.props.view)}s
                      </Text>
                    </TextContent>
                  </SplitItem>
                  <SplitItem isFilled>
                    View
                    <NavDropdown
                      view={this.props.view}
                      mode={this.props.mode}
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
                <TableViewer
                  ref={(el) => (this.tableRef = el)}
                  service={this.props.service}
                  view={this.props.view}
                  handleAddNotification={() => {}}
                  handleShowSubTable={this.handleShowSubTable}
                  history={this.props.history}
                  setOptions={this.props.setOptions}
                />
              </StackItem>
            </React.Fragment>
          )}
        </Stack>
      </PageSection>
    );
  }
}

export default TopologyPage;
