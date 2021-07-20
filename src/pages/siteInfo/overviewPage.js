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
import { Split, SplitItem } from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";

import TimeSeries from "../topology/charts/timeSeries";
import { viewsMap as VIEWS } from "../topology/views/views";
import GetTokenModal from "./getTokenModal";
import UseTokenModal from "./useTokenModal";
import LinkedSitesTable from "./linkedSitesTable";
import { LINKDOWN_VALUE } from "./linksRows";
import UnlinkModal from "./unlinkModal";

import { utils } from "../../utilities";

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
    if (this.tableRef?.update) {
      this.tableRef.update();
    }
    if (this.chartRef1?.update) {
      this.chartRef1.update();
    }
    if (this.chartRef2?.update) {
      this.chartRef2.update();
    }
  };

  addAlert = (alertProps) => {
    if (this.props.addAlert) {
      this.props.addAlert(alertProps);
    }
  };

  actionResolver = (rowData) => {
    const site_id = rowData.data.cardData?.site_id;
    const isCurrent = site_id === this.props.siteInfo.site_id;
    if (isCurrent) return null;
    return this.actions;
  };

  showUnlink = (rowData) => {
    this.setState({
      showUnlinkModal: true,
      unlinkInfo: {
        Name: rowData.data.Name,
      },
    });
  };

  handleUnlinkClose = () => {
    this.setState({ showUnlinkModal: false, unlinkInfo: null });
  };

  doUnlink = (unlinkInfo) => {
    this.props.service.unlinkSite(unlinkInfo).then(
      () => {
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
        <GetTokenModal {...this.props} addAlert={this.addAlert} />
        <UseTokenModal
          {...this.props}
          title="Use a token"
          direction="up"
          addAlert={this.addAlert}
        />
      </EmptyStateSecondaryActions>
    </EmptyState>
  );

  // called after the data for the linedSitesTable is fetched
  // used to add/remove rows
  filterLinkData = (data) => {
    if (data) {
      // remove any disconnected links
      //data = data.filter((d) => d.Status !== LINKDOWN_VALUE);

      if (!data.forEach) debugger;
      // change the name to the linked site's name
      data.forEach((d) => {
        const site = this.props.service.VAN.sites.find(
          (s) => s.site_id === d.site_id
        );
        if (site) {
          d.Name = site.site_name;
        }
      });

      // add the current site to the linked sites rows
      const siteInfo = this.props.service.siteInfo;
      const site = this.props.service.VAN.sites.find(
        (s) => s.site_id === siteInfo.site_id
      );

      const current = {
        Name: siteInfo.site_name,
        "Site type": siteInfo["Site type"],
        site_id: siteInfo.site_id,
        cardData: { ...site },
      };
      current.cardData.name = current.Name;
      current.cardData.shortName = utils.shortName(current.Name);
      current.cardData.nodeType = "cluster";

      return [current, ...data];
    } else {
      return data;
    }
  };

  filterLinkFields = (fields) => {
    return fields.filter((f) => f.title !== "Status");
  };

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
    const { showUnlinkModal, unlinkInfo } = this.state;
    const linkedCount = this.props.service.siteInfo.links.length;
    const data = this.data();
    const hasIn = this.anyRequests("in");
    const hasOut = this.anyRequests("out");

    return (
      <div className="sk-siteinfo-page-wrapper">
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
            <Split gutter="md">
              <SplitItem>
                <h1>Linked sites</h1>
              </SplitItem>
              <SplitItem isFilled></SplitItem>

              <SplitItem>
                <div className="sk-site-actions">
                  <GetTokenModal {...this.props} addAlert={this.addAlert} />
                  <UseTokenModal
                    {...this.props}
                    title="Use a token"
                    direction="up"
                    addAlert={this.addAlert}
                  />
                </div>
              </SplitItem>
            </Split>
            <div className="sk-site-table-wrapper">
              <LinkedSitesTable
                ref={(el) => (this.tableRef = el)}
                {...this.props}
                dataFilter={this.filterLinkData}
                fieldsFilter={this.filterLinkFields}
                actionResolver={this.actionResolver}
              />
            </div>
            {(hasIn || hasOut) && <h1>Site traffic</h1>}
            <Flex
              className="sk-siteinfo-table"
              direction={{ default: "row", lg: "row" }}
            >
              {hasIn && (
                <FlexItem id="sk-subTable-line-in">
                  <TimeSeries
                    ref={(el) => (this.chartRef1 = el)}
                    service={this.props.service}
                    site
                    stat="bytes_out"
                    direction="in"
                    type="line"
                    viewObj={this.viewObj}
                    containerId="sk-subTable-line-in"
                    data={data}
                    showTooltip={this.showTooltip}
                    comment="Line chart for incoming metric"
                  />
                </FlexItem>
              )}
              {hasOut && (
                <FlexItem id="sk-subTable-line-out">
                  <TimeSeries
                    ref={(el) => (this.chartRef2 = el)}
                    service={this.props.service}
                    site
                    stat="bytes_out"
                    direction="out"
                    type="line"
                    viewObj={this.viewObj}
                    containerId="sk-subTable-line-out"
                    data={data}
                    showTooltip={this.showTooltip}
                    comment="Pie or bar chart for incoming metric"
                  />
                </FlexItem>
              )}
            </Flex>
          </React.Fragment>
        )}
      </div>
    );
  }
}

export default OverviewPage;
