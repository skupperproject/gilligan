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
import { Checkbox, Radio } from "@patternfly/react-core";
import PropTypes from "prop-types";
import { Split, SplitItem, TextInput } from "@patternfly/react-core";
import {
  OverflowMenu,
  OverflowMenuControl,
  OverflowMenuContent,
  OverflowMenuGroup,
  OverflowMenuItem,
  OverflowMenuDropdownItem,
} from "@patternfly/react-core";
import { Dropdown, KebabToggle } from "@patternfly/react-core";
import { utils } from "../../utilities";
import "./graphToolbar.css";

import MetricsDrowdown from "./metricsDropdown";
const lastHighlightKey = "highlight";

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
    const lastHighlight = utils.getSaved(lastHighlightKey, "");
    this.state = { searchValue: lastHighlight, isOpen: false };
    this.dropdownItems = [
      {
        key: "requests",
        name: "Requests",
        type: "http",
      },
      {
        key: "bytes_out",
        name: "Bytes",
      },
    ];
  }

  componentDidMount = () => {
    // highlight any services/deployments that match the last highlight string
    this.highlightString(this.state.searchValue);
  };
  componentDidUpdate = () => {
    this.highlightString(this.state.searchValue);
  };

  onToggle = (isOpen) => {
    this.setState({
      isOpen,
    });
  };

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

  highlightString = (value) => {
    setTimeout(() => {
      this.props.handleHighlightService(value);
    }, 0);
  };
  handleTextInputChange = (value) => {
    this.setState({ searchValue: value }, () => {
      utils.setSaved(lastHighlightKey, value);
      this.highlightString(value);
    });
  };

  render() {
    const { statProtocol } = this.props;
    const { radio, traffic, showMetric, hideChart } = this.props.options;
    const { isOpen } = this.state;
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
        <OverflowMenuItem className="toolbar-item" isPersistent>
          <Split className="sk-traffic-split">
            {routerLinksRadio()}
            {trafficCheckOrRadio()}
          </Split>
        </OverflowMenuItem>
        <OverflowMenuItem className="drowdown-group" isPersistent>
          {metricDropdown()}
        </OverflowMenuItem>
      </React.Fragment>
    );

    const metricCheck = () => (
      <OverflowMenuItem className="toolbar-item show-stat" isPersistent>
        <Checkbox
          label="Show metrics"
          isChecked={showMetric}
          isDisabled={this.disableAll()}
          onChange={this.handleChange}
          aria-label="show metrics"
          id="showStat"
          name="showStat"
        />
      </OverflowMenuItem>
    );

    const sidebarCheck = () => (
      <OverflowMenuItem className="toolbar-item" isPersistent>
        <Checkbox
          label="Show charts"
          isChecked={!hideChart}
          onChange={this.handleChange}
          aria-label="show charts"
          id="hideChart"
          name="hideChart"
        />
      </OverflowMenuItem>
    );

    const highlight = () => (
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
    );

    return (
      <OverflowMenu className="graph-toolbar" breakpoint="lg">
        <OverflowMenuContent isPersistent>
          <OverflowMenuGroup isPersistent>
            {sankeyCheck()}
            {metricCheck()}
            {sidebarCheck()}
            <OverflowMenuItem className="toolbar-item last-item">
              {highlight()}
            </OverflowMenuItem>
          </OverflowMenuGroup>
        </OverflowMenuContent>
        {false && (
          <OverflowMenuControl>
            <Dropdown
              toggle={<KebabToggle onToggle={this.onToggle} />}
              isOpen={isOpen}
              isPlain
              dropdownItems={[
                <OverflowMenuDropdownItem key="action" isShared>
                  <TextInput
                    className="sk-toolbar-filter-input"
                    value={this.state.searchValue}
                    type="text"
                    onChange={this.handleTextInputChange}
                    aria-label="text input example"
                  />
                </OverflowMenuDropdownItem>,
              ]}
            />
          </OverflowMenuControl>
        )}
      </OverflowMenu>
    );
  }
}

export default GraphToolbar;
