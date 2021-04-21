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
  EmptyStateSecondaryActions,
} from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";
import SiteInfoTable from "./siteInfoTable";
import GetTokenModal from "./getTokenModal";

import { ALERT_TIMEOUT } from "../../qdrService";
class LinkedSitesPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { alerts: [] };
    this.actions = [
      {
        title: "Unlink",
        onClick: (event, rowId, rowData, extra) => this.unlink(rowId),
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

  componentDidUpdate = () => {};

  getUniqueId = () => new Date().getTime();

  addAlert = (alertProps) => {
    alertProps.key = this.getUniqueId();
    this.setState({ alerts: [...this.state.alerts, alertProps] });
  };

  unlink = (index) => {
    const siteInfo = this.props.service.siteInfo;
    const linkInfo = siteInfo.linked_sites[index];
    this.props.service.unlinkSite(linkInfo).then(
      (results) => {
        const msg = `Site ${linkInfo.Name} unlinked successfully`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error unlinking site ${linkInfo.Name} - ${error.message}`;
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
    const { alerts } = this.state;

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
        )}
        <SiteInfoTable
          {...this.props}
          actions={this.actions}
          dataKey="linked_sites"
          columns={this.columns}
          emptyRows={this.emptyRows}
        />
      </React.Fragment>
    );
  }
}

export default LinkedSitesPage;
