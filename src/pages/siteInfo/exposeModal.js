import React from "react";
import { Modal, Button } from "@patternfly/react-core";
import { Form, FormGroup, TextInput } from "@patternfly/react-core";
import { Select, SelectOption, SelectVariant } from "@patternfly/react-core";
const PORT_SEPERATOR = " - ";
class ExposeModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.props.exposeInfo, // work with a copy in case they cancel the modal. we don't want to have the underlying data changed
      protocolSelected: null,
      portSelected: null,
      isProtocolSelectOpen: false,
      isPortSelectOpen: false,
      port: 27000,
    };

    this.protocols = ["tcp", "http", "http2"];
    this.options = this.protocols.map((protocol, i) => (
      <SelectOption key={i} value={protocol} />
    ));
    if (this.props.exposeInfo.ports && this.props.exposeInfo.ports.length > 0) {
      this.portOptions = this.props.exposeInfo.ports.map((port, i) => (
        <SelectOption key={i} value={this.constructPortValue(port)} />
      ));
      this.state.portSelected = this.constructPortValue(
        this.props.exposeInfo.ports[0]
      );
      const firstNamedPort = this.props.exposeInfo.ports.find((p) =>
        this.protocols.includes(p.name)
      );
      if (firstNamedPort) {
        this.state.protocolSelected = firstNamedPort.name;
      }
    } else {
      this.state.protocolSelected = "tcp";
    }
  }

  constructPortValue = (port) =>
    `${port.name ? port.name : ""}${port.name ? PORT_SEPERATOR : ""}${
      port.port
    }`;

  parsePortValue = (portString) => {
    // parse out the name and port
    const parts = portString.split(PORT_SEPERATOR);
    let protocol = null;
    let port = null;
    if (parts.length === 2) {
      protocol = parts[0];
      port = parts[1];
    } else {
      port = parts[0];
    }
    return { port, protocol };
  };

  handleModalToggle = (event) => {
    this.props.handleModalClose();
  };

  handleModalConfirm = () => {
    this.handleModalToggle();
    const exposeInfo = { ...this.state };
    if (this.portOptions) {
      exposeInfo.port = this.parsePortValue(exposeInfo.portSelected).port;
    }
    exposeInfo.protocol = exposeInfo.protocolSelected || this.protocols[0];
    this.props.doExpose(exposeInfo);
  };

  handleTextInputChange = (val, event) => {
    const field = {};
    field[event.target.name] = val;
    this.setState(field);
  };

  handlePortInputChange = (val) => {
    this.setState({ port: val });
  };

  handleProtocolSelectChange = (event, protocolSelected) => {
    this.setState({
      protocolSelected,
      isProtocolSelectOpen: false,
    });
  };

  handlePortSelectChange = (event, portSelected) => {
    // portSelected looks like "name - port" or just "port"
    let { protocolSelected } = this.state;

    // parse out the name and port
    const parsed = this.parsePortValue(portSelected);

    // if the protocol matches a protocol in the list, select that one
    if (this.options.find((option) => option.key === parsed.protocol)) {
      protocolSelected = parsed.protocol;
    }

    this.setState({
      portSelected,
      protocolSelected,
      isPortSelectOpen: false,
    });
  };

  handleSelectToggle = (isProtocolSelectOpen) => {
    this.setState({
      isProtocolSelectOpen,
    });
  };

  handleSelectPortToggle = (isPortSelectOpen) => {
    this.setState({ isPortSelectOpen });
  };

  render() {
    const {
      name,
      isProtocolSelectOpen,
      isPortSelectOpen,
      protocolSelected,
      portSelected,
      port,
    } = this.state;
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="expose-modal"
          title={`Expose a ${this.props.exposeInfo.type}`}
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
              fieldId="simple-form-name"
            >
              <TextInput
                isRequired
                key="expose-name"
                type="text"
                id="expose-name"
                name="name"
                aria-describedby="simple-form-name-helper"
                value={name}
                onChange={this.handleTextInputChange}
              />
            </FormGroup>
            <FormGroup
              label="Port"
              key="expose-port"
              isRequired
              fieldId="form-use"
            >
              {this.portOptions && (
                <Select
                  variant={SelectVariant.single}
                  placeholderText="Select a port"
                  aria-label="Select port input"
                  onToggle={this.handleSelectPortToggle}
                  onSelect={this.handlePortSelectChange}
                  selections={portSelected}
                  isOpen={isPortSelectOpen}
                  aria-labelledby="expose-port"
                  aria-describedby="expose-port"
                  menuAppendTo={() => document.body}
                >
                  {this.portOptions}
                </Select>
              )}
              {!this.portOptions && (
                <TextInput
                  isRequired
                  key="expose-port"
                  type="number"
                  id="expose-port"
                  name="port"
                  aria-describedby="form-port"
                  value={port}
                  onChange={this.handleTextInputChange}
                />
              )}
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
                selections={protocolSelected}
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
