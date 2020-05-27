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
import { StackItem, TextContent } from "@patternfly/react-core";
import { Split, SplitItem } from "@patternfly/react-core";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbHeading,
} from "@patternfly/react-core";
import LastUpdated from "../../lastUpdated";
import { Icap, viewFromHash } from "../../utilities";

class SubTable extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleChangeLastUpdated = () => {
    this.updatedRef.update();
  };

  update = () => {
    //this.tableRef.update();
    this.handleChangeLastUpdated();
  };

  returnToTable = () => {
    this.props.handleChangeViewType("table");
  };

  render() {
    const { options } = viewFromHash();
    return (
      <React.Fragment>
        <StackItem className="sk-table-header">
          <Split gutter="md">
            <SplitItem>
              <Breadcrumb className="sk-breadcrumbList">
                <BreadcrumbItem onClick={this.returnToTable}>
                  {Icap(this.props.view)}s
                </BreadcrumbItem>
                <BreadcrumbHeading>{options.item}</BreadcrumbHeading>
              </Breadcrumb>
            </SplitItem>
            <SplitItem isFilled></SplitItem>
            <SplitItem>
              <TextContent>
                <LastUpdated ref={(el) => (this.updatedRef = el)} />
              </TextContent>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem className="overview-table"></StackItem>
      </React.Fragment>
    );
  }
}

export default SubTable;
