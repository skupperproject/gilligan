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
import { Alert } from "@patternfly/react-core";
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
import { ALERT_TIMEOUT } from "../../qdrService";

class TokensPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      alerts: [],
      showDownload: false,
      defaultSiteName: null,
      showUpdate: false,
      updateData: null,
    };
    this.actions = [
      {
        title: "Update",
        onClick: (event, rowId, rowData, extra) => this.updateToken(rowId),
      },
      {
        title: "Delete",
        onClick: (event, rowId, rowData, extra) => this.delete(rowId),
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
    alertProps.key = new Date().getTime();
    this.setState({ alerts: [...this.state.alerts, alertProps] });
  };

  handleModalClose = (fields, target) => {
    console.log("handleModalClose called with");
    console.log(fields);
    console.log(target);
    this.setState({ showDownload: false, showUpdate: false });
  };

  updateToken = (index) => {
    const tokenInfo = this.props.service.siteInfo.tokens[index];
    this.setState({ showUpdate: true, updateData: tokenInfo });
  };

  download = (index) => {
    const tokenInfo = this.props.service.siteInfo.tokens[index];
    this.setState({ showDownload: true, defaultSiteName: tokenInfo.Name });
  };

  delete = (index) => {
    const siteInfo = this.props.service.siteInfo;
    const tokenInfo = siteInfo.tokens[index];
    this.props.service.deleteToken(tokenInfo).then(
      (results) => {
        const msg = `Token for ${tokenInfo.Name} successfully deleted`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error revoking token for ${tokenInfo.Name} ${error.message}`;
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
      alerts,
      showDownload,
      defaultSiteName,
      showUpdate,
      updateData,
    } = this.state;

    return (
      <React.Fragment>
        {alerts.map(
          ({
            title,
            variant,
            isLiveRegion,
            ariaLive,
            ariaRelevant,
            ariaAtomic,
            key,
          }) => (
            <Alert
              className="sk-alert"
              variant={variant}
              title={title}
              timeout={ALERT_TIMEOUT}
              isLiveRegion={isLiveRegion}
              aria-live={ariaLive}
              aria-relevant={ariaRelevant}
              aria-atomic={ariaAtomic}
              key={key}
            />
          )
        )}{" "}
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
          />
        )}
      </React.Fragment>
    );
  }
}

export default TokensPage;
