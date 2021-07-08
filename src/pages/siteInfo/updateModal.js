import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form, FormGroup, TextInput } from "@patternfly/react-core";
import { Radio } from "@patternfly/react-core";

class UpdateModal extends React.Component {
  constructor(props) {
    super(props);
    const never = this.props.updateData.Expires === 0;
    this.state = {
      ...this.props.updateData,
      r1h: !never,
      r1d: false,
      rn: never,
    }; // work with a copy in case they cancel the modal
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
    this.setState({ r1h: false, r1d: false, rn: false }, () => {
      this.setState({ [name]: true });
    });
  };

  render() {
    const { Name, r1h, r1d, rn } = this.state;
    const useLimit = this.state["Use limit"];
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="update-modal"
          title="Update a token"
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
                name="Name"
                aria-describedby="simple-form-name-helper"
                value={Name}
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
                value={useLimit}
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
