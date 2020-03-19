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
  Dropdown,
  DropdownPosition,
  DropdownToggle,
  DropdownItem,
  Toolbar,
  ToolbarGroup,
  ToolbarItem
} from "@patternfly/react-core";

import LinkOptions from "./linkOptions";

class GraphToolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDropDownOpen: false,
      checkChanged: false
    };
    this.dropdownItems = [
      {
        key: "graph",
        description: "Graph",
        selected: this.props.viewType === "graph",
        enabled: true
      },
      {
        key: "card",
        description: "Card",
        selected: this.props.viewType === "card"
      },
      {
        key: "table",
        description: "Table",
        selected: this.props.viewType === "table"
      }
    ];
  }

  onDropDownToggle = isOpen => {
    this.setState({
      isDropDownOpen: isOpen
    });
  };

  onDropDownSelect = event => {
    this.setState({
      isDropDownOpen: !this.state.isDropDownOpen
    });
    const desc = event.target.text;
    this.dropdownItems.forEach(item => {
      item.selected = item.description === desc;
    });
    const selected = this.dropdownItems.find(item => item.selected);
    this.props.handleChangeView(selected.key);
  };

  // checkbox was checked
  handleChange = (checked, event) => {
    const { name } = event.target;
    if (name === "showSankey") {
      this.props.handleChangeSankey(checked);
    } else if (name === "showStat") {
      this.props.handleChangeShowStat(checked);
    }
    this.setState({ checkChanged: !this.state.checkChanged });
  };

  onToggle = () => {
    this.setState({
      isOptionsOpen: !this.state.isOptionsOpen
    });
  };

  buildDropdown = () => {
    const { isDropDownOpen } = this.state;
    return (
      <Dropdown
        onSelect={this.onDropDownSelect}
        position={DropdownPosition.left}
        toggle={
          <DropdownToggle onToggle={this.onDropDownToggle}>
            {
              this.dropdownItems.find(item => item.selected === true)
                .description
            }
          </DropdownToggle>
        }
        isOpen={isDropDownOpen}
        dropdownItems={this.dropdownItems.map(item => (
          <DropdownItem
            className={item.selected ? "selected" : ""}
            key={item.key}
            isDisabled={!item.enabled}
          >
            {item.description}
          </DropdownItem>
        ))}
      />
    );
  };

  render() {
    const sankeyCheck = () =>
      this.props.view !== "deployment" && (
        <ToolbarItem>
          <Checkbox
            label="Show relative traffic"
            isChecked={this.props.getShowSankey()}
            onChange={this.handleChange}
            aria-label="show relative traffic"
            id="showSankey"
            name="showSankey"
          />
        </ToolbarItem>
      );

    const statCheck = () => (
      <React.Fragment>
        <ToolbarItem className="toolbar-item">
          <Checkbox
            label="Show statistic"
            isChecked={this.props.getShowStat()}
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
          <ToolbarItem className="pf-u-mr-md">
            View: {this.buildDropdown()}
          </ToolbarItem>
          {sankeyCheck()}
          {statCheck()}
        </ToolbarGroup>
      </Toolbar>
    );
  }
}

export default GraphToolbar;
