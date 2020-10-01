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
import {
  ChartPieIcon,
  ChartBarIcon,
  ChartLineIcon,
} from "@patternfly/react-icons";
import ExpandButton from "../expandButton";
import { ChordIcon } from "../../../assets/chordIcon";

import "./charts.css";
import { CHORD_CHART, LINE_CHART, BAR_CHART, PIE_CHART } from "./chartViewer";

class ChartToolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { type } = this.props;
    return (
      <Split className="sk-chart-toolbar" gutter="md">
        <SplitItem>
          <ExpandButton
            expanded={this.props.isExpanded}
            handleExpandDrawer={this.props.handleExpandDrawer}
            handleCollapseDrawer={this.props.handleCollapseDrawer}
            handleChangeChartType={this.props.handleChangeChartType}
          />
        </SplitItem>
        <SplitItem isFilled></SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            aria-label="Time"
            className={type === LINE_CHART ? "selected" : ""}
            onClick={() => this.props.handleChangeChartType(LINE_CHART)}
            title="Timeseries charts"
          >
            <ChartLineIcon />
          </Button>
        </SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            aria-label={BAR_CHART}
            className={type === BAR_CHART ? "selected rotated" : "rotated"}
            onClick={() => this.props.handleChangeChartType(BAR_CHART)}
            title="Bar charts"
          >
            <ChartBarIcon />
          </Button>
        </SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            aria-label={PIE_CHART}
            className={type === PIE_CHART ? "selected" : ""}
            onClick={() => this.props.handleChangeChartType(PIE_CHART)}
            title="Pie charts"
          >
            <ChartPieIcon />
          </Button>
        </SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            aria-label={CHORD_CHART}
            className={type === CHORD_CHART ? "selected" : ""}
            onClick={() => this.props.handleChangeChartType(CHORD_CHART)}
            title="Chord chart"
          >
            <ChordIcon />
          </Button>
        </SplitItem>
      </Split>
    );
  }
}

export default ChartToolbar;
