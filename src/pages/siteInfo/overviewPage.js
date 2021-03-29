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
import {
  List,
  ListItem,
  ListComponent,
  OrderType,
  Button,
} from "@patternfly/react-core";

import ServiceTable from "./serviceTable";
import DownloadModal from "./downloadModal";
import UploadButton from "./uploadButton"
import CopyButton from "./copyButton";
import PasteButton from "./pasteButton";

class OverviewPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadStatus: null,
      uploadMsg: null,
      getSkupperStatus: null,
      getSkupperMsg: null,
    };
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  update = () => {};
  handleCopy = () => {
    this.props.service.getTokenData().then(
      (results) => {
        const token = JSON.stringify(results, null, 2);
        navigator.clipboard.writeText(token).then(
          (s) => {
            console.log("Copy to clipboard worked");
            this.setState({ uploadMsg: "Token copied to clipboard" });
          },
          (e) => {
            console.log("Copy to clipboard failed");
            console.log(e);
          }
        );
      },
      (error) => {
        console.log(`fetch clipboard data error`);
        console.log(error);
      }
    );
  };

  handlePaste = (element) => {
    let sendToServer = (token) => this.props.service.uploadToken(token);
    if (navigator.clipboard.readText) {
      navigator.clipboard.readText().then((clipText) => {
        sendToServer(clipText).then(
          () => {},
          (error) => {
            console.log(error);
          }
        );
      });
    } else {
      setTimeout(() => {
        const token = element.value;
        sendToServer(token).then(
          () => {
            element.value = `Site linking requested.`;
          },
          (error) => {
            element.value = error;
          }
        );
      }, 0);
    }
  };

  render() {
    const { uploadMsg } = this.state;
    const clipboardSupported = navigator.clipboard.readText;
    return (
      <div className="sk-siteinfo-page-wrapper">
        <h1>Linking a remote site to this site</h1>
        <List>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            <React.Fragment>
              <CopyButton
                {...this.props}
                handleDownloadClicked={this.handleCopy}
                text="Copy a token to the clipboard"
              /> or <DownloadModal {...this.props} text="Download a site linking token to a file" variant="secondary" />
            </React.Fragment>
          </ListItem>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            Navigate to the remote site's Skupper console and use the{" "}
            <h2 className="sk-inline-h2">Linking this site to a remote site</h2>{" "}
            section below to{" "}
            {clipboardSupported
              ? "send the token to create the link."
              : "paste the copied token to create the link."}
          </ListItem>
        </List>
        <h1>Linking this site to a remote site</h1>
        <List>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            Navigate to the remote site's Skupper console and copy a token to
            the clipboard.
          </ListItem>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            {clipboardSupported && (
              <React.Fragment>
                <span>Use the token on the clipboard to create the link.</span>
                <PasteButton
                  handlePasteClicked={this.handlePaste}
                  text="Use the token on the clipboard"
                />
              </React.Fragment>
            )}
            {!clipboardSupported && (
              <React.Fragment>
                <span>
                  Paste the token from the remote site to create a link.
                </span>
                <input
                  ref={(el) => (this.pasteRef = el)}
                  id="skPastedInput"
                  placeholder="Paste copied token from another site here"
                  onPaste={() => this.handlePaste(this.pasteRef)}
                />
              </React.Fragment>
            )} or <UploadButton {...this.props} variant="secondary" />
          </ListItem>
        </List>
        <h1>Linking sites using the command line</h1>
        <div className="sk-sub-text">
          Paul will supply some reasonable text describing this action.
          <Button
            className="sk-block-button"
            component="a"
            href="https://skupper.io/releases/index.html"
            target="_blank"
            variant="primary"
          >
            Download the command-line tool
          </Button>
        </div>
        </div>
    );
  }
}

export default OverviewPage;
