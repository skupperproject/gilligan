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
  Card,
  CardBody,
  PageSection,
  PageSectionVariants,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants
} from "@patternfly/react-core";
import TopologyViewer from "./topologyViewer";
import ServiceDropdown from "./serviceDropdown";
import { reality } from "./topoUtils.js";

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lastUpdated: new Date(),
      serviceTypeName: reality.serviceTypes[0].name
    };
  }

  handleChangeService = serviceTypeName => {
    this.setState({ serviceTypeName });
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
                {`${this.props.type} view`}{" "}
                {this.props.type === "service" ? (
                  <ServiceDropdown
                    service={this.state.serviceTypeName}
                    handleChangeService={this.handleChangeService}
                  />
                ) : (
                  <React.Fragment />
                )}
              </Text>
              <Text className="overview-loading" component={TextVariants.pre}>
                {`Updated ${this.props.service.utilities.strDate(
                  this.state.lastUpdated
                )}`}
              </Text>
            </TextContent>
          </StackItem>
          <StackItem className="overview-table">
            <Card>
              <CardBody>
                <TopologyViewer
                  type={this.props.type}
                  service={this.props.service}
                  serviceTypeName={this.state.serviceTypeName}
                />
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </PageSection>
    );
  }
}

export default TopologyPage;
