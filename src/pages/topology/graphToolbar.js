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
import PropTypes from "prop-types";
import { Split, SplitItem, TextInput } from "@patternfly/react-core";
import "./graphToolbar.css";

import MetricsDrowdown from "./metricsDropdown";

class GraphToolbar extends Component {
  static propTypes = {
    handleChangeSankey: PropTypes.func.isRequired,
    handleChangeShowStat: PropTypes.func.isRequired,
    handleChangeHideChart: PropTypes.func.isRequired,
    handleChangeWidth: PropTypes.func.isRequired,
    handleChangeColor: PropTypes.func.isRequired,
    handleChangeMetric: PropTypes.func.isRequired,
    statProtocol: PropTypes.string.isRequired, // http || tcp || both
    stat: PropTypes.string.isRequired, // requests || bytes_in || bytes_out, etc.
    options: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { searchValue: "", filterValue: "" };
    this.dropdownItems = [
      {
        key: "requests",
        name: "Requests",
        type: "http",
      },
      /*
      {
        key: "bytes_in",
        name: "Bytes in",
      },*/
      {
        key: "bytes_out",
        name: "Bytes",
      } /*
      { key: "latency_max", name: "Latency (max)", type: "http" },
      */,
    ];
  }

  // checkbox was checked
  handleChange = (checked, event) => {
    const { name } = event.target;
    if (name === "showSankey") {
      this.props.handleChangeSankey(checked);
    } else if (name === "showWidth") {
      this.props.handleChangeWidth(checked);
    } else if (name === "showStat") {
      this.props.handleChangeShowStat(checked);
    } else if (name === "showColor") {
      this.props.handleChangeColor(checked);
    } else if (name === "showRouterLinks") {
      this.props.handleChangeSankey(!checked);
    } else if (name === "hideChart") {
      this.props.handleChangeHideChart(!checked);
    }
  };

  disableAll = () => {
    const { options } = this.props;
    if (options.radio && !options.traffic) return true;
    return false;
  };

  disableUsing = () => {
    const { options } = this.props;
    if (this.disableAll() || !options.traffic) return true;
    return false;
  };

  handleTextInputChange = (value) => {
    this.setState({ searchValue: value }, () => {
      this.props.handleHighlightService(value);
    });
  };

  handleFilterInputChange = (value) => {
    this.setState({ filterValue: value }, () => {
      this.props.handleHideService(value);
    });
  };

  render() {
    const { statProtocol } = this.props;
    const { radio, traffic, showMetric, hideChart } = this.props.options;
    const routerLinksRadio = () => {
      if (radio) {
        return (
          <SplitItem>
            <Radio
              label="Show connections"
              isChecked={!traffic}
              onChange={this.handleChange}
              aria-label="router links"
              id="showRouterLinks"
              name="showRouterLinks"
              className="router-links"
            />
          </SplitItem>
        );
      }
    };
    const metricDropdown = () => (
      <SplitItem>
        <span>Traffic metric</span>
        <MetricsDrowdown
          dropdownItems={this.dropdownItems.filter(
            (i) => !i.type || i.type === statProtocol
          )}
          stat={this.props.stat}
          handleChangeOption={this.props.handleChangeMetric}
          isDisabled={this.disableAll()}
        />
      </SplitItem>
    );

    const trafficCheckOrRadio = () => {
      return (
        <SplitItem>
          {radio && (
            <Radio
              label="Show relative traffic"
              isChecked={traffic}
              onChange={this.handleChange}
              aria-label="show relative traffic"
              id="showSankey"
              name="showSankey"
            />
          )}
          {!radio && (
            <Checkbox
              label="Show relative traffic"
              isChecked={traffic}
              onChange={this.handleChange}
              aria-label="show relative traffic"
              id="showSankey"
              name="showSankey"
            />
          )}
        </SplitItem>
      );
    };

    const sankeyCheck = () => (
      <React.Fragment>
        <ToolbarItem className="toolbar-item">
          <Split className="sk-traffic-split">
            {routerLinksRadio()}
            {trafficCheckOrRadio()}
          </Split>
        </ToolbarItem>
        <ToolbarItem className="drowdown-group">{metricDropdown()}</ToolbarItem>
      </React.Fragment>
    );

    const metricCheck = () => (
      <ToolbarItem className="toolbar-item show-stat">
        <Checkbox
          label="Show metrics"
          isChecked={showMetric}
          isDisabled={this.disableAll()}
          onChange={this.handleChange}
          aria-label="show metrics"
          id="showStat"
          name="showStat"
        />
      </ToolbarItem>
    );

    const sidebarCheck = () => (
      <ToolbarItem className="toolbar-item">
        <Checkbox
          label="Show charts"
          isChecked={!hideChart}
          onChange={this.handleChange}
          aria-label="show charts"
          id="hideChart"
          name="hideChart"
        />
      </ToolbarItem>
    );

    const highlight = () => (
      <ToolbarItem className="toolbar-item last-item">
        <Split>
          <SplitItem>
            <span>Highlight</span>
          </SplitItem>
          <SplitItem className="sk-toolbar-filter">
            <TextInput
              value={this.state.searchValue}
              type="search"
              onChange={this.handleTextInputChange}
              aria-label="search text input"
              placeholder={`Highlight ${this.props.view}s...`}
            />
          </SplitItem>
        </Split>
      </ToolbarItem>
    );

    const filter = () => (
      <ToolbarItem className="toolbar-item last-item">
        <Split>
          <SplitItem>
            <span>Filter</span>
          </SplitItem>
          <SplitItem className="sk-toolbar-filter">
            <TextInput
              value={this.state.filterValue}
              type="search"
              onChange={this.handleFilterInputChange}
              aria-label="filter text input"
              placeholder={`Hide ${this.props.view}s...`}
            />
          </SplitItem>
        </Split>
      </ToolbarItem>
    );

    return (
      <Toolbar className="graph-toolbar">
        <ToolbarGroup>
          {sankeyCheck()}
          {metricCheck()}
          {sidebarCheck()}
          {highlight()}
          {false && filter()}
        </ToolbarGroup>
      </Toolbar>
    );
  }
}

export default GraphToolbar;
