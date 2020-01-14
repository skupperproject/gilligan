import React from "react";
import { Dropdown, DropdownToggle, DropdownItem } from "@patternfly/react-core";
import { CaretDownIcon } from "@patternfly/react-icons";
import { utils } from "../amqp/utilities";

class LinkOptions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOptionsOpen: false
    };
  }

  onToggle = isOptionsOpen => {
    this.setState({
      isOptionsOpen
    });
  };
  onSelect = event => {
    const which = event.target.text.toLowerCase();
    this.props.handleChangeOption(which);
    this.setState({ isOptionsOpen: !this.state.isOptionsOpen });
    this.onFocus();
  };

  onFocus = () => {
    const element = document.getElementById("toggle-id");
    element.focus();
  };

  render() {
    const { isOptionsOpen } = this.state;
    const { stat } = this.props.options;
    const dropdownItems = [
      <DropdownItem
        key="protocol"
        className={stat === "protocol" ? "selected" : ""}
      >
        Protocol
      </DropdownItem>,
      <DropdownItem
        key="security"
        className={stat === "security" ? "selected" : ""}
      >
        Security
      </DropdownItem>,
      <DropdownItem
        key="throughput"
        className={stat === "throughput" ? "selected" : ""}
      >
        Throughput
      </DropdownItem>,
      <DropdownItem
        key="latency"
        className={stat === "latency" ? "selected" : ""}
      >
        Latency
      </DropdownItem>
    ];

    return (
      <Dropdown
        onSelect={this.onSelect}
        toggle={
          <DropdownToggle
            id="toggle-id"
            onToggle={this.onToggle}
            iconComponent={CaretDownIcon}
          >
            {this.props.options.stat
              ? utils.Icap(this.props.options.stat)
              : "Show"}
          </DropdownToggle>
        }
        isOpen={isOptionsOpen}
        dropdownItems={dropdownItems}
      />
    );
  }
}

export default LinkOptions;
