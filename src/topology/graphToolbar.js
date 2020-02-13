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
    this.state = {};
    this.dropdownItems = [
      {
        key: "namespace",
        description: "Sites",
        selected: this.props.initialView === "namespace"
      },
      {
        key: "application",
        description: "Application",
        selected: this.props.initialView === "application"
      },
      {
        key: "traffic",
        description: "Relative traffic",
        selected: this.props.initialView === "traffic"
      },
      {
        key: "chord",
        description: "Message flow",
        selected: this.props.initialView === "chord"
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
    this.props.handleChangeView(
      this.dropdownItems.find(item => item.selected === true).key
    );
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
          >
            {item.description}
          </DropdownItem>
        ))}
      />
    );
  };

  render() {
    return (
      <Toolbar className="graph-toolbar pf-l-toolbar pf-u-justify-content-space-between pf-u-px-xl pf-u-py-md">
        <ToolbarGroup>
          <ToolbarItem className="pf-u-mr-md">
            {this.buildDropdown()}{" "}
            <LinkOptions
              adapter={this.props.service.adapter}
              options={this.props.options.link}
              handleChangeOption={this.props.handleChangeOption}
            />
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    );
  }
}

export default GraphToolbar;
