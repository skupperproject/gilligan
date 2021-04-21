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
import NavDropdown from "../../navDropdown";
import { utils } from "../../utilities";
import LastUpdated from "../../lastUpdated";
import TableViewer from "./tableViewer";
import SubTable from "./subtable/subTable";

class TablePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropDownOpen: false,
      subPageInfo: {},
      data: null,
      origin: "table",
    };
  }

  handleChangeLastUpdated = () => {
    this.updatedRef.update();
  };

  update = () => {
    this.tableRef.update();
    this.handleChangeLastUpdated();
  };

  handleShowSubTable = (origin = "table", subPageInfo, card) => {
    const useTableOrigin = origin === "table" || origin === "overview";
    this.props.handleChangeViewMode("details", useTableOrigin, origin);
    const options = {
      view: this.props.view,
      mode: "details",
      item: useTableOrigin ? subPageInfo.value : subPageInfo.address,
    };
    this.props.setOptions(options, true);
    if (useTableOrigin) {
      this.setState({ subPageInfo, data: null, origin });
    } else {
      this.setState({ subPageInfo: { card }, data: subPageInfo, origin: null });
    }
  };

  render() {
    const { origin } = this.state;
    return (
      <PageSection variant={PageSectionVariants.light} className="table-page">
        <Stack>
          <React.Fragment>
            <StackItem className="overview-header">
              <Split gutter="md">
                <SplitItem>
                  <TextContent>
                    <Text className="overview-title" component={TextVariants.p}>
                      {utils.Icap(this.props.view)}s
                    </Text>
                  </TextContent>
                </SplitItem>
                <SplitItem isFilled className="sk-dropdown-prompt">
                  <NavDropdown
                    view={this.props.view}
                    mode="table"
                    handleChangeViewMode={this.props.handleChangeViewMode}
                  />
                </SplitItem>
                <SplitItem>
                  <TextContent>
                    <LastUpdated ref={(el) => (this.updatedRef = el)} />
                  </TextContent>
                </SplitItem>
              </Split>
            </StackItem>
            {this.props.mode === "details" && (
              <StackItem className="sk-subtable">
                <SubTable
                  ref={(el) => (this.tableRef = el)}
                  service={this.props.service}
                  view={this.props.view}
                  info={this.state.subPageInfo}
                  data={this.state.data}
                  history={this.props.history}
                  handleChangeViewMode={this.props.handleChangeViewMode}
                  setOptions={this.props.setOptions}
                  origin={origin}
                />
              </StackItem>
            )}
            {this.props.mode === "table" && (
              <StackItem className="overview-table">
                <TableViewer
                  ref={(el) => (this.tableRef = el)}
                  service={this.props.service}
                  view={this.props.view}
                  handleAddNotification={() => {}}
                  handleShowSubTable={this.handleShowSubTable}
                  history={this.props.history}
                  setOptions={this.props.setOptions}
                  mode={this.props.mode}
                />
              </StackItem>
            )}
          </React.Fragment>
        </Stack>
      </PageSection>
    );
  }
}

export default TablePage;
