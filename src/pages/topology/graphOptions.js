import React from "react";
import {
  Checkbox,
  Dropdown,
  DropdownToggle,
  DropdownItem,
} from "@patternfly/react-core";
import { CaretDownIcon } from "@patternfly/react-icons";

class GraphOptions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOptionsOpen: false,
    };
  }

  onToggle = (isOptionsOpen) => {
    this.setState({
      isOptionsOpen,
    });
  };

  onChangeTraffic = (checked, event) => {
    this.props.handleChangeOption(event.target.name);
  };

  onFocus = () => {
    const element = document.getElementById("toggle-id");
    try {
      element.focus();
    } catch (e) {}
  };

  render() {
    const { isOptionsOpen } = this.state;
    const { traffic, utilization } = this.props.options;
    const dropdownItems = [
      <DropdownItem key="traffic">
        <Checkbox
          label="Show traffic"
          isChecked={traffic}
          onChange={this.onChangeTraffic}
          aria-label="show traffic by address"
          id="check-traffic-address"
          name="traffic"
        />
      </DropdownItem>,
    ];

    return (
      <Dropdown
        toggle={
          <DropdownToggle
            id="toggle-id"
            onToggle={this.onToggle}
            iconComponent={CaretDownIcon}
          >
            Graph options
          </DropdownToggle>
        }
        isOpen={isOptionsOpen}
        dropdownItems={dropdownItems}
      />
    );
  }
}

export default GraphOptions;
