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
import { utils } from "../../utilities";
import LastUpdated from "../../lastUpdated";

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropDownOpen: false,
    };
  }

  handleChangeLastUpdated = () => {
    if (this.updatedRef) this.updatedRef.update();
  };

  update = () => {
    this.graphRef.update();
    this.handleChangeLastUpdated();
  };

  handleOverrideOptions = (newOptions) => {
    if (this.graphRef && this.graphRef.handleOverrideOptions)
      this.graphRef.handleOverrideOptions(newOptions);
  };

  render() {
    return (
      <PageSection
        variant={PageSectionVariants.light}
        className="topology-page"
      >
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
                    mode={this.props.mode}
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
        </Stack>
      </PageSection>
    );
  }
}

export default TopologyPage;
