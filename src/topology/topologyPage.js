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
  TextVariants
} from "@patternfly/react-core";
import TopologyViewer from "./topologyViewer";
import { Icap, strDate } from "../qdrGlobals";

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lastUpdated: new Date(),
      serviceTypeName: "All",
      options: {
        graph: {
          traffic: false,
          utilization: false
        },
        link: { stat: "" }
      }
    };
    this.initialView = "namespace";
  }

  handleChangeService = serviceTypeName => {
    this.setState({ serviceTypeName });
  };

  handleChangeView = key => {
    this.graphRef[`to${Icap(key)}`]();
  };

  handleChangeOption = option => {
    const { options } = this.state;
    if (option === "traffic" || option === "utilization") {
      options.graph[option] = !options.graph[option];
    } else {
      options.link.stat = options.link.stat === option ? null : option;
    }
    this.setState({ options }, () => {
      this.graphRef.setLinkStat();
    });
  };

  render() {
    return (
      <PageSection
        variant={PageSectionVariants.light}
        className="topology-page"
      >
        <Stack>
          <StackItem className="overview-header">
            <TextContent>
              <Text className="overview-title" component={TextVariants.h1}>
                Mesh view
              </Text>
              <Text className="overview-loading" component={TextVariants.pre}>
                {`Updated ${strDate(this.state.lastUpdated)}`}
              </Text>
            </TextContent>
          </StackItem>
          <StackItem className="overview-table">
            <TopologyViewer
              ref={el => (this.graphRef = el)}
              type={this.props.type}
              service={this.props.service}
              serviceTypeName={this.state.serviceTypeName}
              options={this.state.options}
              initialView={this.initialView}
              handleChangeView={this.handleChangeView}
              handleChangeOption={this.handleChangeOption}
            />
          </StackItem>
        </Stack>
      </PageSection>
    );
  }
}

export default TopologyPage;
