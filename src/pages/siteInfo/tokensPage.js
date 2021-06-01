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
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Bullseye,
  Title,
  EmptyStateIcon,
} from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";
import SiteInfoTable from "./siteInfoTable";
import DownloadModal from "./downloadModal";
import UpdateModal from "./updateModal";
import DeleteModal from "./deleteModal";

class TokensPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showDownload: false,
      defaultSiteName: null,
      showUpdate: false,
      updateData: null,
      showDeleteModal: false,
      deleteInfo: null,
    };
    this.actions = [
      {
        title: "Update",
        onClick: (event, rowId, rowData, extra) => this.updateToken(rowId),
      },
      {
        title: "Delete",
        onClick: (event, rowId, rowData, extra) =>
          this.showDeleteModal(rowData),
      },
      {
        title: "Download",
        onClick: (event, rowId, rowData, extra) => this.download(rowId),
      },
    ];
    this.columns = [
      "Name",
      "Status",
      "Use count",
      "Use limit",
      { name: "Expires", dateType: "future" },
      { name: "Created", dateType: "past" },
    ];
    this.emptyRows = [
      {
        heightAuto: true,
        cells: [
          {
            props: { colSpan: 6 },
            title: (
              <Bullseye>
                <EmptyState variant={EmptyStateVariant.small}>
                  <EmptyStateIcon icon={SearchIcon} />
                  <Title headingLevel="h2" size="lg">
                    No tokens found
                  </Title>
                  <EmptyStateBody>
                    No link tokens have been issued for this site.
                  </EmptyStateBody>
                </EmptyState>
              </Bullseye>
            ),
          },
        ],
      },
    ];
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  componentDidUpdate = () => {};

  addAlert = (alertProps) => {
    if (this.props.addAlert) {
      this.props.addAlert(alertProps);
    }
  };

  handleModalClose = () => {
    this.setState({
      showDownload: false,
      showUpdate: false,
      showDeleteModal: false,
    });
  };

  updateToken = (index) => {
    const tokenInfo = this.props.service.siteInfo.tokens[index];
    if (tokenInfo["Use limit"] === undefined) {
      tokenInfo["Use limit"] = 1;
    }
    this.setState({ showUpdate: true, updateData: tokenInfo });
  };

  doUpdate = (updateData) => {
    let expires = 0; // default to never
    if (updateData.r1d) {
      // they requested expires 1 day from now
      expires = new Date();
      expires.setDate(expires.getDate() + 1);
    } else if (updateData.r1h) {
      // they requested expires 1 hour from now
      expires = new Date();
      expires.setData(expires.getTime() + 1 * 60 * 60 * 1000);
    }
    const data = {
      ID: updateData.ID,
      Expires: expires,
      Name: updateData.Name,
      "Use limit": updateData["Use limit"],
    };
    const name = updateData.Name;
    this.props.service.updateToken(data).then(
      () => {
        const msg = `Token for ${name} successfully updated`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error updating token for ${name} ${error.message}`;
        console.error(msg);
        this.addAlert({
          title: msg,
          variant: "danger",
          ariaLive: "assertive",
          ariaRelevant: "additions text",
          ariaAtomic: "false",
        });
      }
    );
    this.handleModalClose();
  };

  download = (index) => {
    const tokenInfo = this.props.service.siteInfo.tokens[index];
    this.setState({ showDownload: true, defaultSiteName: tokenInfo.Name });
  };

  showDeleteModal = (tokenInfo) => {
    this.setState({ showDeleteModal: true, deleteInfo: tokenInfo });
  };

  doDelete = (deleteInfo) => {
    const data = { ID: deleteInfo.actionProps.data.site_id };
    const name = deleteInfo.actionProps.data.site_name;
    this.props.service.deleteToken(data).then(
      () => {
        const msg = `Token for ${name} successfully deleted`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error deleting token for ${name} ${error.message}`;
        console.error(msg);
        this.addAlert({
          title: msg,
          variant: "danger",
          ariaLive: "assertive",
          ariaRelevant: "additions text",
          ariaAtomic: "false",
        });
      }
    );
  };

  update = () => {};

  render() {
    const {
      showDownload,
      defaultSiteName,
      showUpdate,
      updateData,
      showDeleteModal,
      deleteInfo,
    } = this.state;

    return (
      <React.Fragment>
        <SiteInfoTable
          {...this.props}
          actions={this.actions}
          dataKey="tokens"
          columns={this.columns}
          emptyRows={this.emptyRows}
        />
        {showDownload && (
          <DownloadModal
            {...this.props}
            handleModalClose={this.handleModalClose}
            showOpen={true}
            hideButton={true}
            defaultSiteName={defaultSiteName}
          />
        )}
        {showUpdate && (
          <UpdateModal
            {...this.props}
            updateData={updateData}
            handleModalClose={this.handleModalClose}
            isModalOpen={showUpdate}
            doUpdate={this.doUpdate}
          />
        )}
        {showDeleteModal && (
          <DeleteModal
            {...this.props}
            deleteInfo={deleteInfo}
            handleModalClose={this.handleModalClose}
            doDelete={this.doDelete}
          />
        )}
      </React.Fragment>
    );
  }
}

export default TokensPage;
