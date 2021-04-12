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

import ServiceTable from "./serviceTable";

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
    return (
      <div className="sk-siteinfo-page-wrapper">
        <h1>Services</h1>
        <ServiceTable />
      </div>
    );
  }
}

export default OverviewPage;
