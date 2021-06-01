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

import React from "react";
import EditIcon from "@patternfly/react-icons/dist/js/icons/edit-alt-icon";

class InlineEdit extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isEditing: false, value: this.props.name };
  }

  componentDidMount = () => {
    document.addEventListener("mousedown", this.handleMouseOutside);
    document.addEventListener("keyup", this.handleKeyUp);
  };

  componentWillUnmount = () => {
    document.removeEventListener("mousedown", this.handleMouseOutside);
    document.removeEventListener("keyup", this.handleKeyUp);
  };

  componentDidUpdate = (newProps) => {
    if (newProps.name !== this.state.value) {
      if (this.state.value === null) {
        this.setState({ value: newProps.name });
      }
      if (this.editRef) {
        this.editRef.focus();
      }
    }
  };

  handleMouseOutside = (event) => {
    const { value } = this.state;
    if (this.editRef && !this.editRef.contains(event.target)) {
      this.setState({ isEditing: false, value: null });
      this.props.handleSiteNameChange(value);
    }
  };

  handleKeyUp = (event) => {
    // ESC pressed while editing, reset value and stop editing
    if (event.keyCode === 27 && this.state.isEditing) {
      this.setState({ isEditing: false, value: null });
    }
  };

  // clicked on the edit icon
  handleClick = () => {
    this.setState({ isEditing: !this.state.isEditing }, () => {
      if (this.editRef && this.state.isEditing) {
        this.editRef.focus();
      } else {
        // isEditing was true, but is now false
        this.props.handleSiteNameChange(this.state.value);
      }
    });
  };

  // called externally to force start editing
  triggerEdit = () => {
    if (!this.state.isEditing) {
      this.handleClick();
    }
  };

  handleValueChange = (event) => {
    this.setState({ value: event.target.value });
  };

  render() {
    const { isEditing, value } = this.state;
    const { name } = this.props;
    return (
      <React.Fragment>
        {isEditing && (
          <input
            ref={(el) => (this.editRef = el)}
            className="sk-inline-edit"
            type="text"
            value={value}
            onChange={this.handleValueChange}
          />
        )}
        {!isEditing && name}
        <button
          className="sk-action-button"
          type="button"
          aria-expanded="false"
          aria-label="Edit site name"
          onClick={this.handleClick}
          title={"Edit site name"}
        >
          <EditIcon aria-hidden />
        </button>
      </React.Fragment>
    );
  }
}

export default InlineEdit;
