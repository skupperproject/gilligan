import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form, FormGroup, TextInput } from "@patternfly/react-core";
import { Select, SelectOption, SelectVariant } from "@patternfly/react-core";
class ExposeModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.props.exposeInfo,
      selected: "TCP",
      isProtocolSelectOpen: false,
    }; // work with a copy in case they cancel the modal

    this.options = [
      <SelectOption key={0} value="TCP" />,
      <SelectOption key={1} value="HTTP" />,
      <SelectOption key={2} value="AMQP" />,
    ];
  }

  handleModalToggle = (event) => {
    this.props.handleModalClose();
  };

  handleModalConfirm = () => {
    this.handleModalToggle();
    const exposeInfo = { ...this.state };
    exposeInfo.Protocol = exposeInfo.selected;
    this.props.doExpose(exposeInfo);
  };

  handleTextInputChange = (val, event) => {
    const field = {};
    field[event.target.name] = val;
    this.setState(field);
  };

  handlePortInputChange = (val) => {
    this.setState({ Port: val });
  };

  handleProtocolSelectChange = (event, selection) => {
    console.log(
      `exposeModal::handleProtocolSelectChange selection was changed to`
    );
    console.log(selection);
    this.setState({
      selected: selection,
      isProtocolSelectOpen: false,
    });
  };

  handleSelectToggle = (isProtocolSelectOpen) => {
    this.setState({
      isProtocolSelectOpen,
    });
  };

  render() {
    const { Name, Port, isProtocolSelectOpen, selected } = this.state;
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="expose-modal"
          title="Expose a deployment"
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
              key="expose-port"
              isRequired
              fieldId="form-use"
            >
              <TextInput
                isRequired
                key="expose-port"
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
            <FormGroup
              label="Protocol"
              key="expose-protocol"
              isRequired
              fieldId="form-use"
            >
              <Select
                variant={SelectVariant.single}
                placeholderText="Select an option"
                aria-label="Select Input"
                onToggle={this.handleSelectToggle}
                onSelect={this.handleProtocolSelectChange}
                selections={selected}
                isOpen={isProtocolSelectOpen}
                aria-labelledby="expose-protocol"
                aria-describedby="expose-protocol"
                menuAppendTo={() => document.body}
              >
                {this.options}
              </Select>
            </FormGroup>
          </Form>
        </Modal>
      </React.Fragment>
    );
  }
}

export default ExposeModal;
