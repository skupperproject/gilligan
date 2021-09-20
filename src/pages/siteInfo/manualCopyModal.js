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
import { Modal, Button } from "@patternfly/react-core";
import { Form } from "@patternfly/react-core";
import { HelperText, HelperTextItem } from "@patternfly/react-core";

class ManualCopyModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      copyText: this.props.copyText,
    };
  }

  componentDidMount = () => {
    setTimeout(() => {
      if (this.copyRef) {
        this.copyRef.focus();
        this.copyRef.select();
      }
    }, 1);
  };

  handleModalToggle = (event) => {
    this.props.handleModalClose();
  };

  render() {
    const { copyText } = this.state;
    return (
      <React.Fragment>
        <Modal
          width={"50%"}
          key="manual-modal"
          title={`Manually copy token to clipboard`}
          isOpen={true}
          onClose={this.handleModalToggle}
          actions={[
            <Button key="done" variant="link" onClick={this.handleModalToggle}>
              Done
            </Button>,
          ]}
          isfooterleftaligned={"true"}
        >
          <Form key="update-form" isHorizontal>
            <HelperText>
              <HelperTextItem>
                Your browser does not allow automatically copying to the
                clipboard. Press Ctrl-C to manually copy the token to the
                clipboard.
              </HelperTextItem>
            </HelperText>
            <input
              ref={(el) => (this.copyRef = el)}
              readOnly
              key="copy-text"
              id="copy-text"
              name="copy"
              aria-describedby="text to copy"
              value={copyText}
              type="password"
            />
          </Form>
        </Modal>
      </React.Fragment>
    );
  }
}

export default ManualCopyModal;
