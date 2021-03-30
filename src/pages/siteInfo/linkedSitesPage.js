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
import { Alert, AlertActionCloseButton  } from '@patternfly/react-core';
import SiteInfoTable from "./siteInfoTable";

const MESSAGE_TIMEOUT = 6000;
class LinkedSitesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {revokeStatus: null, revokeMessage: null};
    this.actions = [
      {
        title: "Unlink",
        onClick: (event, rowId, rowData, extra) => this.unlink(rowId)      },
    ];
    this.columns = [
      "Name",
      "Status",
      "Site type",
      "Cost",
      { name: "Linked", dateType: "present" },
    ];
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  componentDidUpdate = () => {};

  resetStatus = () => {
    const self = this;
    setTimeout(() => {self.setState({ revokeStatus: null})}, MESSAGE_TIMEOUT)
  }

  unlink = (index) => {
    this.props.service.unlinkSite(index).then((results) => {
      console.log("Token revoked successfully");
      this.setState({revokeStatus: 200, revokeMessage: "Token successfully revoked"}, this.resetStatus);
    }, (error) => {
      console.log(`error revoking token ${error.message}`);
      this.setState({revokeStatus: 400, revokeMessage: error.message});
    })
  };

  update = () => {};

  render() {
    const { revokeMessage, revokeStatus } = this.state;
    return (
      <React.Fragment>
        {revokeStatus && <Alert isLiveRegion variant={revokeStatus === 200 ? "info" : "danger"} title={revokeStatus === 200 ? "Token revoked" : "Error revoking token"} actionClose={<AlertActionCloseButton onClose={() => alert('Clicked the close button')} />} timeout={MESSAGE_TIMEOUT}>{revokeMessage}</Alert>}
      <SiteInfoTable
        {...this.props}
        actions={this.actions}
        dataKey="linked_sites"
        columns={this.columns}
      />
      </React.Fragment>
    );
  }
}

export default LinkedSitesPage;
