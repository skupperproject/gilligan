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
  EmptyStateSecondaryActions,
} from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";
import SiteInfoTable from "./siteInfoTable";
import GetTokenModal from "./getTokenModal";
import UnlinkModal from "./unlinkModal";

class LinkedSitesTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showUnlinkModal: false, unlinkInfo: null };
    this.actions = [
      {
        title: "Unlink",
        onClick: (event, rowId, rowData, extra) => this.showUnlink(rowData),
      },
    ];
    this.columns = [
      "Name",
      "Status",
      "Site type",
      "Cost",
      { name: "Linked", dateType: "present" },
    ];
    this.emptyRows = [
      {
        heightAuto: true,
        cells: [
          {
            props: { colSpan: 5 },
            title: (
              <Bullseye>
                <EmptyState variant={EmptyStateVariant.small}>
                  <EmptyStateIcon icon={SearchIcon} />
                  <Title headingLevel="h2" size="lg">
                    No linked sites found
                  </Title>
                  <EmptyStateBody>
                    No sites have been linked to this site.
                  </EmptyStateBody>
                  <EmptyStateSecondaryActions>
                    <GetTokenModal {...this.props} />
                  </EmptyStateSecondaryActions>
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

  addAlert = (alertProps) => {
    if (this.props.addAlert) {
      this.props.addAlert(alertProps);
    }
  };

  showUnlink = (rowData) => {
    const data = rowData.data
      ? rowData.data.cardData
      : rowData.actionProps.data;
    this.setState({
      showUnlinkModal: true,
      unlinkInfo: {
        Name: data.site_name,
        site_id: data.site_id,
      },
    });
  };

  handleUnlinkClose = () => {
    this.setState({ showUnlinkModal: false, unlinkInfo: null });
  };

  doUnlink = (unlinkInfo) => {
    this.props.service.unlinkSite(unlinkInfo).then(
      () => {
        if (!this.mounted) return;
        const msg = `Site ${unlinkInfo.Name} unlinked successfully`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        if (!this.mounted) return;
        const msg = `Error unlinking site ${unlinkInfo.Name} - ${error.message}`;
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
    const { showUnlinkModal, unlinkInfo } = this.state;

    return (
      <React.Fragment>
        {showUnlinkModal && (
          <UnlinkModal
            {...this.props}
            unlinkInfo={unlinkInfo}
            handleModalClose={this.handleUnlinkClose}
            doUnlink={this.doUnlink}
          />
        )}

        <SiteInfoTable
          {...this.props}
          actions={this.actions}
          dataKey="linked_sites"
          columns={this.props.columns ? this.props.columns : this.columns}
          emptyRows={this.emptyRows}
        />
      </React.Fragment>
    );
  }
}

export default LinkedSitesTable;
