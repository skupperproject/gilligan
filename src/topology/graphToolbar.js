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

import LinkOptions from "./linkOptions";

class GraphToolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checkChanged: false,
    };
  }

  // checkbox was checked
  handleChange = (checked, event) => {
    const { name } = event.target;
    if (name === "showSankey") {
      this.props.handleChangeSankey(checked);
    } else if (name === "showStat") {
      this.props.handleChangeShowStat(checked);
    } else if (name === "showWidth") {
      this.props.handleChangeWidth(checked);
    } else if (name === "showColor") {
      this.props.handleChangeColor(checked);
    } else if (name === "showRouterLinks") {
      this.props.handleChangeSankey(!checked);
    }
    this.setState({ checkChanged: !this.state.checkChanged });
  };

  render() {
    const routerLinksRadio = () => {
      if (this.props.view === "site") {
        return (
          <Radio
            label="Show router connections"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                preserveAspectRatio="xMidYMid meet"
                width="140"
                height="44"
              >
                <defs>
                  <linearGradient
                    xmlns="http://www.w3.org/2000/svg"
                    id="colorGradient"
                    gradientUnits="userSpaceOnUse"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      style={{ stopColor: "#888888", stopOpacity: 1 }}
                      offset="0"
                    />
                    <stop
                      style={{ stopColor: "#888888", stopOpacity: 1 }}
                      offset="0.333"
                    />
                    <stop
                      style={{ stopColor: "#00FF00", stopOpacity: 1 }}
                      offset="0.334"
                    />
                    <stop
                      style={{ stopColor: "#00FF00", stopOpacity: 1 }}
                      offset="0.666"
                    />
                    <stop
                      style={{ stopColor: "#0000FF", stopOpacity: 1 }}
                      offset="0.667"
                    />
                    <stop
                      style={{ stopColor: "#0000FF", stopOpacity: 1 }}
                      offset="1"
                    />
                  </linearGradient>
                </defs>
                <g>
                  <rect
                    width="140"
                    height="20"
                    x="0"
                    y="0"
                    fill="url(#colorGradient)"
                  ></rect>
                  <text x="1" y="30" textAnchor="start">
                    Low
                  </text>
                  <text x="130" y="30" textAnchor="end">
                    High
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </ToolbarItem>
    );

    const statCheck = () => (
      <React.Fragment>
        <ToolbarItem className="toolbar-item">
          <Checkbox
            label="Show statistic"
            isChecked={this.props.getShowStat()}
            isDisabled={
              this.props.view === "site" && !this.props.getShowSankey()
                ? true
                : false
            }
            onChange={this.handleChange}
            aria-label="show statistic"
            id="showStat"
            name="showStat"
          />
        </ToolbarItem>
        {false && (
          <ToolbarItem className="toolbar-item">
            <LinkOptions {...this.props} showStat={this.props.getShowStat()} />
          </ToolbarItem>
        )}
      </React.Fragment>
    );

    return (
      <Toolbar className="graph-toolbar pf-l-toolbar pf-u-justify-content-space-between pf-u-px-xl pf-u-py-md">
        <ToolbarGroup>
          {sankeyCheck()}
          {statCheck()}
        </ToolbarGroup>
      </Toolbar>
    );
  }
}

export default GraphToolbar;
