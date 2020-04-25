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
  Checkbox,
  Radio,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
} from "@patternfly/react-core";

import MetricsDrowdown from "./metricsDropdown";
import { ColorRange } from "./colorRange";

class GraphToolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checkChanged: false,
    };
    this.dropdownItems = [
      {
        key: "none",
        name: "None",
      },
      {
        key: "requests",
        name: "Requests",
        type: "http",
      },
      {
        key: "bytes_in",
        name: "Bytes in",
      },
      {
        key: "bytes_out",
        name: "Bytes out",
      },
      { key: "latency", name: "Latency (max)", type: "http" },
    ];
  }

  // checkbox was checked
  handleChange = (checked, event) => {
    const { name } = event.target;
    if (name === "showSankey") {
      this.props.handleChangeSankey(checked);
    } else if (name === "showWidth") {
      this.props.handleChangeWidth(checked);
    } else if (name === "showColor") {
      this.props.handleChangeColor(checked);
    } else if (name === "showRouterLinks") {
      this.props.handleChangeSankey(!checked);
    }
    this.setState({ checkChanged: !this.state.checkChanged });
  };

  statsEnabled = () => {
    if (this.props.view === "site" && !this.props.getShowSankey()) return false;
    return true;
  };
  render() {
    const { statProtocol } = this.props;
    const routerLinksRadio = () => {
      if (this.props.view === "site") {
        return (
          <Radio
            label="Show connections"
            isChecked={!this.props.getShowSankey()}
            onChange={this.handleChange}
            aria-label="router links"
            id="showRouterLinks"
            name="showRouterLinks"
            className="router-links"
          />
        );
      }
    };
    const trafficCheckOrRadio = () => {
      if (this.props.view === "site") {
        return (
          <Radio
            label="Show relative traffic"
            isChecked={this.props.getShowSankey()}
            onChange={this.handleChange}
            aria-label="show relative traffic"
            id="showSankey"
            name="showSankey"
          />
        );
      } else {
        return (
          <Checkbox
            label="Show relative traffic"
            isChecked={this.props.getShowSankey()}
            onChange={this.handleChange}
            aria-label="show relative traffic"
            id="showSankey"
            name="showSankey"
          />
        );
      }
    };
    const sankeyCheck = () => (
      <ToolbarItem className="toolbar-item tall-item">
        {routerLinksRadio()}
        <div className="traffic-group">
          {trafficCheckOrRadio()}
          <div className="indent-group">
            <Radio
              label="using width"
              isChecked={this.props.getShowWidth()}
              isDisabled={!this.props.getShowSankey()}
              onChange={this.handleChange}
              aria-label="wide traffic"
              id="showWidth"
              name="showWidth"
            />
            <div className="color-gradient">
              <Radio
                label="using color"
                isChecked={this.props.getShowColor()}
                isDisabled={!this.props.getShowSankey()}
                onChange={this.handleChange}
                aria-label="colored traffic"
                id="showColor"
                name="showColor"
              />
              <ColorRange />
            </div>
          </div>
        </div>
      </ToolbarItem>
    );

    return (
      <Toolbar className="graph-toolbar pf-l-toolbar pf-u-justify-content-space-between pf-u-px-xl pf-u-py-md">
        <ToolbarGroup>
          {sankeyCheck()}
          <ToolbarItem className="stat-dropdown">
            {
              <span className={this.statsEnabled() ? "" : "disabled"}>
                Show metric
              </span>
            }
            <MetricsDrowdown
              dropdownItems={this.dropdownItems}
              stat={this.props.stat}
              handleChangeOption={this.props.handleChangeShowStat}
              isDisabled={!this.statsEnabled()}
              type={statProtocol}
            />
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    );
  }
}

export default GraphToolbar;
