import React from "react";
import { Dropdown, DropdownToggle, DropdownItem } from "@patternfly/react-core";
import PropTypes from "prop-types";

class MetricsDrowdown extends React.Component {
  static propTypes = {
    dropdownItems: PropTypes.array.isRequired,
    stat: PropTypes.string.isRequired,
    handleChangeOption: PropTypes.func.isRequired,
    isDisabled: PropTypes.bool,
    type: PropTypes.string,
  };
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
  onSelect = (event) => {
    this.props.handleChangeOption(this.props.type, event.target.name);
    this.setState({ isOptionsOpen: !this.state.isOptionsOpen });
    this.onFocus();
  };

  onFocus = () => {
    const element = document.getElementById("toggle-id");
    element.focus();
  };

  render() {
    const { isOptionsOpen } = this.state;
    const { stat, type, dropdownItems } = this.props;
    const items = dropdownItems
      .filter((o) => !o.type || o.type === type)
      .map((option, i) => (
        <DropdownItem
          key={option.key}
          name={option.key}
          className={stat === option.key ? "selected" : ""}
        >
          {option.name}
        </DropdownItem>
      ));
    const selectedOption = dropdownItems.find(
      (option) => option.key === stat
    ) || { name: "-" };
    return (
      <Dropdown
        id="navDropdown"
        onSelect={this.onSelect}
        toggle={
          <DropdownToggle
            id="toggle-id"
            onToggle={this.onToggle}
            isDisabled={this.props.isDisabled}
          >
            {selectedOption.name}
          </DropdownToggle>
        }
        isOpen={isOptionsOpen}
        dropdownItems={items}
      />
    );
  }
}

export default MetricsDrowdown;
