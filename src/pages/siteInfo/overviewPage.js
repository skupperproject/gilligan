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

  componentDidUpdate = () => {};

  onFileChange = (event) => {
    const file = event.target.files[0];
    let data = new FormData();
    data.append("file", file);
    console.log(file);
    console.log(data);
    this.props.service.uploadToken(data).then(
      (response) => {
        if (!this.mounted) return;
        if (response.status < 200 || response.status > 299) {
          this.setState({
            uploadMsg: `${response.url} returned ${response.statusText}`,
            uploadStatus: response.status,
          });
        }
        console.log("normal response");
        console.log(response);
      },
      (error) => console.log(`error response ${error}`)
    );
  };

  update = () => {};

  render() {
    const { uploadStatus, uploadMsg } = this.state;
    return (
      <div className="sk-siteinfo-page-wrapper">
        <h1>Contents</h1>
        <List>
          <ListItem>Linking a remote site to this site</ListItem>
          <ListItem>Linking this site to a remote site</ListItem>
          <ListItem>Linking sites using the command line</ListItem>
          <ListItem>Exposing services on the network</ListItem>
          <ListItem>Connecting to services on the network</ListItem>
        </List>
        <h2>Linking a remote site to this site</h2>
        <List>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            Download and save a token that is used to link remote sites to this
            site.
            <DownloadModal {...this.props} />
          </ListItem>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            Navigate to the remote site's Skupper console and upload the saved
            token to create the link.
          </ListItem>
        </List>
        <h2>Linking this site to a remote site</h2>
        <List>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            Navigate to the remote site's Skupper console and download a token.
          </ListItem>
          <ListItem component={ListComponent.ol} type={OrderType.number}>
            Upload the saved token from the remote site to create a link.
            <div className="container">
              <div className="button-wrap">
                <label className="button" htmlFor="upload">
                  Upload a link token
                </label>
                <input onChange={this.onFileChange} id="upload" type="file" />
              </div>
              <span
                className={`sk-upload-status ${
                  uploadStatus !== 200 ? "error" : "success"
                }`}
              >
                {uploadMsg}
              </span>
            </div>
          </ListItem>
        </List>
        <h2>Linking sites using the command line</h2>
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
        <h2>Exposing services on the network</h2>
        <div className="sk-sub-text">
          Paul will do his stuff here.
          <div className="sk-command-line-example">
            $ skupper expose deployment/
            <span className="sk-command-line">{"<deployment-name>"}</span>
          </div>
        </div>
        <h2>Connecting to services on the network</h2>
        <div className="sk-sub-text">
          Paul will supply some reasonable text describing this action.
          <ServiceTable />
        </div>
      </div>
    );
  }
}

export default OverviewPage;
