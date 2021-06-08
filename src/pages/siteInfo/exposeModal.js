import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form, FormGroup, TextInput } from "@patternfly/react-core";

class ExposeModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.props.exposeInfo,
    }; // work with a copy in case they cancel the modal
  }

  handleModalToggle = (event) => {
    this.props.handleModalClose();
  };

  handleModalConfirm = () => {
    this.handleModalToggle();
    this.props.doExpose(this.state);
  };

  handleTextInputChange = (val, event) => {
    const field = {};
    field[event.target.name] = val;
    this.setState(field);
  };

  handlePortInputChange = (val) => {
    this.setState({ Port: val });
  };

  render() {
    const { Name, Port } = this.state;
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="expose-modal"
          title="Expose a service"
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Button
              key="confirm"
              variant="primary"
              onClick={this.handleModalConfirm}
            >
              Expose
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
                key="expose-name"
                type="text"
                id="expose-name"
                name="Name"
                aria-describedby="simple-form-name-helper"
                value={Name}
                onChange={this.handleTextInputChange}
              />
            </FormGroup>
            <FormGroup
              label="Port"
              key="expose-name"
              isRequired
              fieldId="form-use"
            >
              <TextInput
                isRequired
                key="update-use"
                type="number"
                id="expose-port"
                min={0}
                name="Port"
                aria-describedby="simple-form-port-helper"
                value={Port}
                onChange={this.handlePortInputChange}
                className="sk-input-numeric-medium"
              />
            </FormGroup>
          </Form>
        </Modal>
      </React.Fragment>
    );
  }
}

export default ExposeModal;
