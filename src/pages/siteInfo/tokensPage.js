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
import { Split, SplitItem } from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";
import SiteInfoTable from "./siteInfoTable";
import DownloadModal from "./downloadModal";
import UpdateModal from "./updateModal";
import DeleteModal from "./deleteModal";
import GetTokenModal from "./getTokenModal";
import UseTokenModal from "./useTokenModal";

class TokensPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showDownload: false,
      tokenName: null,
      showUpdate: false,
      updateData: null,
      showDeleteModal: false,
      deleteInfo: null,
    };
    this.actions = [
      /*{
        title: "Update",
        onClick: (event, rowId, rowData, extra) => this.updateToken(rowId),
      },*/
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
      { name: "name", title: "Name" },
      { name: "claimsMade", title: "Claims made" },
      { name: "claimsRemaining", title: "Claims remaining" },
      { name: "created", title: "Created", dateType: "past" },
      {
        name: "claimExpiration",
        title: "Claim expiration",
        dateType: "future",
      },
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
    if (tokenInfo["claimsRemaining"] === undefined) {
      tokenInfo["claimsRemaining"] = 1;
    }
    this.setState({ showUpdate: true, updateData: tokenInfo });
  };

  doUpdate = (updateData) => {
    let expires = 0; // default to never
    let now = new Date();
    if (updateData.r1d) {
      // they requested expires 1 day from now
      expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (updateData.r1h) {
      // they requested expires 1 hour from now
      expires = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    } else if (updateData.r15m) {
      // they requested expires 15 min from now
      expires = new Date(now.getTime() + 15 * 60 * 1000);
      console.log(`tokensPage::doUpdate expires`);
      console.log(expires);
    }
    let iClaims = parseInt(updateData.claimsRemaining, 10);
    const data = {
      name: updateData.name,
      claimsRemaining: isNaN(iClaims) ? 0 : iClaims,
      claimExpiration: expires,
    };
    console.log(`tokensPage::doUpdate data sent`);
    console.log(data);
    const name = updateData.name;
    this.props.service.updateToken(data).then(
      () => {
        const msg = `Token ${name} successfully updated`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error updating token ${name} ${error.message}`;
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
    this.setState({ showDownload: true, tokenName: tokenInfo.name });
  };

  showDeleteModal = (tokenInfo) => {
    this.setState({ showDeleteModal: true, deleteInfo: tokenInfo });
  };

  doDelete = (deleteInfo) => {
    const data = { name: deleteInfo.name.title };
    this.props.service.deleteToken(data).then(
      () => {
        const msg = `Token ${data.name} successfully deleted`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error deleting token ${data.name} ${error.message}`;
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

  doDownload = (fileName) => {
    console.log(`tokensPage::doDownload called with ${fileName}`);
    this.handleModalClose();
  };

  update = () => {
    if (this.tableRef && this.tableRef.update) {
      this.tableRef.update();
    }
  };

  render() {
    const {
      showDownload,
      tokenName,
      showUpdate,
      updateData,
      showDeleteModal,
      deleteInfo,
    } = this.state;

    return (
      <div className="sk-siteinfo-page-wrapper">
        <Split gutter="md">
          <SplitItem>
            <h1>Link tokens</h1>
          </SplitItem>
          <SplitItem isFilled></SplitItem>

          <SplitItem>
            <div className="sk-site-actions">
              <GetTokenModal {...this.props} targetId="SKUSETOKEN1" />
              <UseTokenModal
                {...this.props}
                title="Use a token"
                direction="up"
                targetId="SKUSETOKEN1"
              />
            </div>
          </SplitItem>
        </Split>
        <div className="sk-sub-text">
          Link tokens issued from this site allow other Skupper sites to
          establish a connection to this site. To create a new link token, use
          the 'Link a remote site' button.
        </div>
        <h1 className="sk-secondary-section">Tokens issued from this site</h1>
        <SiteInfoTable
          ref={(el) => (this.tableRef = el)}
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
            tokenName={tokenName}
            doDownload={this.doDownload}
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
      </div>
    );
  }
}

export default TokensPage;
