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
import { Button, Checkbox } from "@patternfly/react-core";
import PropTypes from "prop-types";
import { Split, SplitItem, TextInput } from "@patternfly/react-core";
import { CogIcon } from "@patternfly/react-icons";

import {
  OverflowMenu,
  OverflowMenuContent,
  OverflowMenuItem,
} from "@patternfly/react-core";
import TrafficModal from "./trafficModal";
import { utils } from "../../utilities";
import "./graphToolbar.css";

const lastHighlightKey = "highlight";

class GraphToolbar extends Component {
  static propTypes = {
    handleChangeSankey: PropTypes.func.isRequired,
    handleChangeShowStat: PropTypes.func.isRequired,
    handleChangeColor: PropTypes.func.isRequired,
    handleChangeMetric: PropTypes.func.isRequired,
    handleChangeExternal: PropTypes.func.isRequired,
    statProtocol: PropTypes.string.isRequired, // http || tcp || both
    stat: PropTypes.string.isRequired, // requests || bytes_in || bytes_out, etc.
    options: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    const lastHighlight = utils.getSaved(lastHighlightKey, "");
    this.state = {
      searchValue: lastHighlight,
      isOpen: false,
      isTrafficModelOpen: false,
    };
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

  onSelect = (event) => {
    console.log("onSelect called");
    event.persist();
    console.log(event);
    if (event.target.id === "trafficOptions") {
      console.log("showing traffic modal");
      this.handleShowTrafficModal();
    }
    this.setState({
      isOpen: !this.state.isOpen,
    });
  };

  // checkbox was checked
  handleChange = (checked, event) => {
    const { name } = event.target;
    if (name === "showSankey") {
      this.props.handleChangeSankey(checked);
    } else if (name === "showStat") {
      this.props.handleChangeShowStat(checked);
    } else if (name === "showColor") {
      this.props.handleChangeColor(checked);
    } else if (name === "showRouterLinks") {
      this.props.handleChangeSankey(!checked);
    } else if (name === "showExternal") {
      this.props.handleChangeExternal(checked);
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
  handleShowTrafficModal = () => {
    this.setState({ isTrafficModelOpen: true }, () => {
      if (this.trafficRef) {
        this.trafficRef.init();
      }
    });
  };

  handleTrafficModalToggle = (confirmed, state) => {
    if (confirmed) {
      this.props.handleChangeSankey(state.traffic);
      this.props.handleChangeShowStat(state.showMetrics);
      this.props.handleChangeMetric(state.metric);
    }
    this.setState({ isTrafficModelOpen: false });
  };

  render() {
    const { showExternal } = this.props.options;

    const derivedCheck = () => (
      <Checkbox
        label="Show external clients"
        isChecked={showExternal}
        onChange={this.handleChange}
        aria-label="show external clients"
        id="showExternal"
        name="showExternal"
      />
    );

    const metricCheck = () => (
      <SplitItem>
        <Button
          variant="link"
          icon={<CogIcon />}
          onClick={this.handleShowTrafficModal}
          iconPosition="right"
        >
          Traffic options
        </Button>
        <TrafficModal
          ref={(el) => (this.trafficRef = el)}
          isTrafficModalOpen={this.state.isTrafficModelOpen}
          handleTrafficModalToggle={this.handleTrafficModalToggle}
          handleChangeSankey={this.props.handleChangeSankey}
          options={this.props.options}
          stat={this.props.stat}
        />
      </SplitItem>
    );

    const highlight = () => (
      <Split>
        <SplitItem id="skToolbarHighlight">
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
      <OverflowMenu className="graph-toolbar" breakpoint="md">
        <OverflowMenuContent isPersistent>
          <OverflowMenuItem isPersistent>{derivedCheck()}</OverflowMenuItem>
        </OverflowMenuContent>
        <OverflowMenuContent className="hasButton">
          <OverflowMenuItem>{metricCheck()}</OverflowMenuItem>
        </OverflowMenuContent>
        <OverflowMenuContent>
          <OverflowMenuItem>{highlight()}</OverflowMenuItem>
        </OverflowMenuContent>
      </OverflowMenu>
    );
  }
}

export default GraphToolbar;

/*
        <OverflowMenuControl>
          <Dropdown
            onSelect={this.onSelect}
            toggle={<KebabToggle onToggle={this.onToggle} />}
            isOpen={isOpen}
            isPlain
            dropdownItems={dropdownItems}
          />
        </OverflowMenuControl>


        <OverflowMenu className="graph-toolbar" breakpoint="lg">
        <OverflowMenuContent isPersistent>
          <OverflowMenuGroup isPersistent>
            {sankeyCheck()}
            {metricCheck()}
            {derivedCheck()}
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
*/
