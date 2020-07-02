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
import { Button, Split, SplitItem } from "@patternfly/react-core";
import { ChartPieIcon, ChartBarIcon } from "@patternfly/react-icons";
import "./charts.css";

class ChartToolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleChangeChartType = (type) => {
    this.props.handleChangeChartType(type);
  };

  render() {
    return (
      <Split className="sk-chart-toolbar" gutter="md">
        <SplitItem isFilled></SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            aria-label="Action"
            className={this.props.type === "bar" ? "selected" : ""}
            onClick={() => this.handleChangeChartType("bar")}
          >
            <ChartBarIcon />
          </Button>
        </SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            aria-label="Action"
            className={this.props.type === "pie" ? "selected" : ""}
            onClick={() => this.handleChangeChartType("pie")}
          >
            <ChartPieIcon />
          </Button>
        </SplitItem>
      </Split>
    );
  }
}

export default ChartToolbar;
