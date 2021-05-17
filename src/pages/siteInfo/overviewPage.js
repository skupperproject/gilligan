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
  Title,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  EmptyStateSecondaryActions,
} from "@patternfly/react-core";
import { Flex, FlexItem } from "@patternfly/react-core";
import { Alert } from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";

import PieBar from "../topology/charts/pieBar";
import { viewsMap as VIEWS } from "../topology/views/views";
import GetTokenModal from "./getTokenModal";
import UseTokenModal from "./useTokenModal";
import TableViewer from "../table/tableViewer";
import ServiceTable from "./serviceTable";
import { SiteInfoRows, linkedSitesFields } from "./siteInfoRows";
import UnlinkModal from "./unlinkModal";
import { ALERT_TIMEOUT } from "../../qdrService";

class OverviewPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      uploadStatus: null,
      uploadMsg: null,
      getSkupperStatus: null,
      getSkupperMsg: null,
      showUnlinkModal: false,
      unlinkInfo: null,
      alerts: [],
    };
    this.viewObj = new VIEWS["site"](this.props.service);
    this.actions = [
      {
        title: "Unlink",
        onClick: (event, rowId, rowData, extra) => this.showUnlink(rowData),
      },
    ];
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  update = () => {
    this.forceUpdate();
  };

  getUniqueId = () => new Date().getTime();

  fetchLinkSites = (page, perPage) => {
    return new Promise((resolve) => {
      SiteInfoRows(this.emptyState(), this.props.service, true).then((data) => {
        console.log("get siteinforows");
        console.log(data);
        resolve({ data, page, perPage });
      });
    });
  };

  addAlert = (alertProps) => {
    alertProps.key = this.getUniqueId();
    this.setState({ alerts: [...this.state.alerts, alertProps] });
  };

  actionResolver = (rowData) => {
    const site_id = rowData.data.cardData.site_id;
    const isCurrent = site_id === this.props.siteInfo.site_id;
    if (isCurrent) return null;
    return this.actions;
  };

  showUnlink = (rowData) => {
    const site_name = rowData.data.cardData.site_name;
    const site_id = rowData.data.cardData.site_id;
    this.setState({
      showUnlinkModal: true,
      unlinkInfo: {
        Name: site_name,
        site_id: site_id,
      },
    });
  };

  handleUnlinkClose = () => {
    this.setState({ showUnlinkModal: false, unlinkInfo: null });
  };

  doUnlink = (unlinkInfo) => {
    this.props.service.unlinkSite(unlinkInfo).then(
      (results) => {
        const msg = `Site ${unlinkInfo.Name} unlinked successfully`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
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

  handleShowSubTable = (_, subPageInfo) => {
    this.props.handleViewDetails(
      "details",
      subPageInfo,
      subPageInfo.card,
      "overview"
    );
    const options = {
      view: this.props.view,
      mode: "details",
      item: subPageInfo.value,
    };
    this.props.setOptions(options, true);
  };

  data = () => {
    const siteInfo = this.props.service.siteInfo;
    return {
      site_name: siteInfo.site_name,
      site_id: siteInfo.site_id,
      nodeType: "cluster",
    };
  };

  emptyState = () => (
    <EmptyState variant={EmptyStateVariant.xs} className="sk-empty-container">
      <EmptyStateIcon icon={SearchIcon} />

      <Title headingLevel="h4" size="md">
        No linked sites
      </Title>
      <EmptyStateBody>There are no sites linked to this site</EmptyStateBody>
      <EmptyStateSecondaryActions>
        <GetTokenModal {...this.props} noIcon />
      </EmptyStateSecondaryActions>
    </EmptyState>
  );

  anyRequests = (direction) => {
    const data = this.data();
    let address = data ? data.address : null;
    let site_info = null;
    if (this.props.view === "deployment" && data.address) {
      site_info = data.cluster.site_name;
    } else if (this.props.view === "site" && !data.address) {
      address = data.site_id;
    }
    const requests = this.viewObj.specificTimeSeries({
      VAN: this.props.service.VAN,
      direction,
      stat: "bytes_out",
      duration: "min",
      address,
      site_name: site_info,
    });
    return Object.keys(requests).length > 0;
  };

  render() {
    const { showUnlinkModal, unlinkInfo, alerts } = this.state;
    const linkedCount = this.props.service.siteInfo.linked_sites.length;
    const data = this.data();
    const hasIn = this.anyRequests("in");
    const hasOut = this.anyRequests("out");

    return (
      <div className="sk-siteinfo-page-wrapper">
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
        {showUnlinkModal && (
          <UnlinkModal
            {...this.props}
            unlinkInfo={unlinkInfo}
            handleModalClose={this.handleUnlinkClose}
            doUnlink={this.doUnlink}
          />
        )}
        {linkedCount === 0 && this.emptyState()}
        {linkedCount > 0 && data && (
          <React.Fragment>
            <h1>Linked sites</h1>
            <Flex
              className="sk-siteinfo-table"
              direction={{ default: "column", lg: "row" }}
            >
              <FlexItem id="sk-subTable-bar0">
                <div className="sk-site-table-wrapper">
                  <TableViewer
                    ref={(el) => (this.tableRef = el)}
                    {...this.props}
                    view="site"
                    fields={linkedSitesFields}
                    doFetch={this.fetchLinkSites}
                    noToolbar
                    excludeCurrent={false}
                    handleAddNotification={() => {}}
                    handleShowSubTable={this.handleShowSubTable}
                    actionResolver={this.actionResolver}
                  />
                  <GetTokenModal {...this.props} title="Link another site" />
                  <UseTokenModal
                    {...this.props}
                    title="Use a token"
                    direction="up"
                  />
                </div>
              </FlexItem>
              {hasIn && (
                <FlexItem id="sk-subTable-bar1">
                  <PieBar
                    ref={(el) => (this.pieRef1 = el)}
                    service={this.props.service}
                    site={
                      this.props.view === "site" ||
                      this.props.view === "deployment"
                    }
                    deployment={this.props.view === "deployment"}
                    stat="bytes_out"
                    direction="in"
                    type="bar"
                    viewObj={this.viewObj}
                    containerId="sk-subTable-bar1"
                    data={data}
                    showTooltip={this.showTooltip}
                    comment="Pie or bar chart for incoming metric"
                  />
                </FlexItem>
              )}
              {hasOut && (
                <FlexItem id="sk-subTable-bar2">
                  <PieBar
                    ref={(el) => (this.pieRef2 = el)}
                    service={this.props.service}
                    site={
                      this.props.view === "site" ||
                      this.props.view === "deployment"
                    }
                    deployment={this.props.view === "deployment"}
                    stat="bytes_out"
                    direction="out"
                    type="bar"
                    viewObj={this.viewObj}
                    containerId="sk-subTable-bar2"
                    data={data}
                    showTooltip={this.showTooltip}
                    comment="Pie or bar chart for incoming metric"
                  />
                </FlexItem>
              )}
            </Flex>
          </React.Fragment>
        )}
        <div className="sk-section">
          <h1>Services</h1>
          <ServiceTable {...this.props} />
        </div>
      </div>
    );
  }
}

export default OverviewPage;
