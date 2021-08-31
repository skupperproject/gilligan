import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form, FormGroup, TextInput } from "@patternfly/react-core";
import { Radio } from "@patternfly/react-core";
import { utils } from "../../utilities";

class UpdateModal extends React.Component {
  constructor(props) {
    super(props);
    const expires = this.expires();
    this.state = {
      ...this.props.updateData, // work with a copy in case they cancel the modal
      r15m: expires === "15m",
      r1h: expires === "1h",
      r1d: expires === "1d",
      rn: expires === "never",
    };
  }

  handleModalToggle = (event) => {
    if (this.props.handleModalClose) {
      // notify the containing component that the modal should be closed
      this.props.handleModalClose(this.state);
    }
  };

  handleModalConfirm = () => {
    this.props.doUpdate(this.state);
  };

  handleTextInputChange = (val, event) => {
    const field = {};
    field[event.target.name] = val;
    this.setState(field);
  };

  handleChangeExpires = (_, event) => {
    const name = event.currentTarget.name;
    this.setState({ r15m: false, r1h: false, r1d: false, rn: false }, () => {
      this.setState({ [name]: true });
    });
  };

  expires = () => {
    const expires = this.props.updateData.claimExpiration;
    if (!expires || expires === "0") return "never";
    const date = new Date(expires);
    const timeTillInSeconds = Math.floor((date - new Date()) / 1000);
    if (timeTillInSeconds < 0) {
      // expires was in the past
      return "15m";
    }
    try {
      const { interval, epoch } = utils.getDuration(timeTillInSeconds);
      if (epoch === "minute" && interval <= 15) return "15m";
      if (epoch === "hour" && interval <= 1) return "1h";
      if (epoch === "day" && interval <= 1) return "1d";
      return "15m";
    } catch (e) {
      return "15m";
    }
  };

  render() {
    const { name, claimsRemaining, r15m, r1h, r1d, rn } = this.state;
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="update-modal"
          title="Update token"
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Button
              key="confirm"
              variant="primary"
              onClick={this.handleModalConfirm}
            >
              Update
            </Button>,
            <Button
              key="cancel"
              variant="link"
              onClick={this.handleModalToggle}
            >
              Cancel
            </Button>,
          ]}
          isfooterleftaligned={"true"}
        >
          <Form key="update-form" isHorizontal>
            <FormGroup
              label="Name"
              key="name-formGroup"
              isRequired
              fieldId="simple-form-name"
            >
              <TextInput
                isRequired
                key="update-name"
                type="text"
                id="simple-form-name"
                name="name"
                aria-describedby="simple-form-name-helper"
                value={name}
                onChange={this.handleTextInputChange}
              />
            </FormGroup>
            <FormGroup
              label="Claims remaining"
              key="use-formGroup"
              isRequired
              fieldId="form-use"
            >
              <TextInput
                isRequired
                key="update-use"
                type="number"
                id="form-use"
                min={0}
                name="claimsRemaining"
                aria-describedby="simple-form-name-helper"
                value={claimsRemaining}
                onChange={this.handleTextInputChange}
                className="sk-input-numeric-small"
              />
            </FormGroup>
            <FormGroup
              label="Expires"
              key="expiry-formGroup"
              fieldId="form-expiry"
            >
              <Radio
                id="radio-15m"
                label="15 minutes from now"
                name="r15m"
                isChecked={r15m}
                value={r15m}
                onChange={this.handleChangeExpires}
              />
              <Radio
                id="radio-1h"
                label="1 hour from now"
                name="r1h"
                isChecked={r1h}
                value={r1h}
                onChange={this.handleChangeExpires}
              />
              <Radio
                id="radio-1d"
                label="1 day from now"
                name="r1d"
                isChecked={r1d}
                value={r1d}
                onChange={this.handleChangeExpires}
              />
              <Radio
                id="radio-n"
                label="Never"
                name="rn"
                isChecked={rn}
                value={rn}
                onChange={this.handleChangeExpires}
              />
            </FormGroup>
          </Form>
        </Modal>
      </React.Fragment>
    );
  }
}

export default UpdateModal;
