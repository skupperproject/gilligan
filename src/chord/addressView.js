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
import SankeyComponent from "./sankeyComponent";
import AddressDropdown from "./addressDropdown";
import { reality } from "../topology/topoUtils";

class AddressPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      width: 0,
      height: 0,
      data: null,
      lastUpdated: new Date(),
      addressName: reality.serviceInstances[0].address
    };
  }

  handleChangeAddress = addressName => {
    this.setState({ addressName });
  };

  // called only once when the component is initialized
  componentDidMount() {
    const gap = 5;
    let legendWidth = 4;
    let topoWidth = this.chordRef.offsetWidth;
    if (topoWidth < 768) legendWidth = 0;
    let width = topoWidth - gap - legendWidth;
    let height = this.chordRef.offsetHeight;

    const graph = {
      nodes: reality.serviceTypes.map((st, i) => ({ node: i, name: st.name })),
      links: reality.serviceInstances.map((si, i) => ({
        source: si.source,
        target: si.target,
        value: si.stats.total,
        address: si.address
      }))
    };
    this.setState({ data: graph, width, height }, () => {
      this.sankey = new SankeyComponent();
      this.sankey.init({
        data: graph,
        width,
        height,
        address: this.state.addressName,
        handleChangeAddress: this.handleChangeAddress
      });
    });
  }

  componentWillUnmount() {
    // stop updated the data
    clearInterval(this.interval);
    this.sankey.stop();
  }

  init = () => {};

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
                <AddressDropdown
                  address={this.state.addressName}
                  handleChangeAddress={this.handleChangeAddress}
                />
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
                <div ref={el => (this.chordRef = el)} className="qdrChord">
                  {this.state.width && (
                    <React.Fragment>
                      <canvas
                        width={this.state.width}
                        height={this.state.height}
                      />
                    </React.Fragment>
                  )}
                </div>
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </PageSection>
    );
  }
}

export default AddressPage;
