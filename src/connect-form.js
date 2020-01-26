/*
 * Copyright 2019 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from "react";
import {
  Form,
  FormGroup,
  TextInput,
  ActionGroup,
  Button,
  TextContent,
  Text,
  TextVariants
} from "@patternfly/react-core";

class ConnectForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      address: "localhost",
      port: "5673",
      username: "",
      password: ""
    };
  }

  handleTextInputChange = (value, event) => {
    const newState = {};
    newState[event.target.name] = value;
    this.setState(newState);
  };

  handleConnect = () => {
    if (this.props.isConnected) {
      console.log("disconnecting");
      this.props.service.disconnect();
      this.props.handleConnect(this.props.fromPath, false);
    } else {
      const options = JSON.parse(JSON.stringify(this.state));
      options.reconnect = true;
      this.props.service.connect(options).then(
        r => {
          this.props.handleConnect(this.props.fromPath, true);
        },
        e => {
          console.log(e);
        }
      );
    }
  };

  toggleDrawerHide = () => {
    this.props.handleConnectCancel();
  };

  render() {
    const { address, port, username, password } = this.state;

    return (
      <div>
        <div className="_connect-modal">
          <div className="">
            <Form isHorizontal>
              <TextContent className="connect-title">
                <Text component={TextVariants.h1}>Connect</Text>
                <Text component={TextVariants.p}>
                  Enter the address and port of a skupper stats server.
                </Text>
              </TextContent>
              <FormGroup
                label="Address"
                isRequired
                fieldId={`form-address-${this.props.prefix}`}
              >
                <TextInput
                  value={address}
                  isRequired
                  type="text"
                  id={`form-address-${this.props.prefix}`}
                  aria-describedby="horizontal-form-address-helper"
                  name="address"
                  onChange={this.handleTextInputChange}
                />
              </FormGroup>
              <FormGroup
                label="Port"
                isRequired
                fieldId={`form-port-${this.props.prefix}`}
              >
                <TextInput
                  value={port}
                  onChange={this.handleTextInputChange}
                  isRequired
                  type="number"
                  id={`form-port-${this.props.prefix}`}
                  name="port"
                />
              </FormGroup>
              <FormGroup
                label="User name"
                fieldId={`form-user-${this.props.prefix}`}
              >
                <TextInput
                  value={username}
                  onChange={this.handleTextInputChange}
                  isRequired
                  id={`form-user-${this.props.prefix}`}
                  name="username"
                />
              </FormGroup>
              <FormGroup
                label="Password"
                fieldId={`form-password-${this.props.prefix}`}
              >
                <TextInput
                  value={password}
                  onChange={this.handleTextInputChange}
                  type="password"
                  id={`form-password-${this.props.prefix}`}
                  name="password"
                />
              </FormGroup>
              <ActionGroup>
                <Button variant="primary" onClick={this.handleConnect}>
                  {this.props.isConnected ? "Disconnect" : "Connect"}
                </Button>
                <Button variant="secondary" onClick={this.toggleDrawerHide}>
                  Cancel
                </Button>
              </ActionGroup>
            </Form>
          </div>
        </div>
      </div>
    );
  }
}

export default ConnectForm;
