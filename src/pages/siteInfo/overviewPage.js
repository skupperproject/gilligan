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
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";

import PieBar from "../topology/charts/pieBar";
import { viewsMap as VIEWS } from "../topology/views/views";
import GetTokenModal from "./getTokenModal";
import TableViewer from "../table/tableViewer";

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
    this.viewObj = new VIEWS["site"](this.props.service);
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  update = () => {};

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
    const linkedCount = this.props.service.siteInfo.linked_sites.length;
    const data = this.data();
    const hasIn = this.anyRequests("in");
    const hasOut = this.anyRequests("out");

    return (
      <div className="sk-siteinfo-page-wrapper">
        {linkedCount === 0 && (
          <EmptyState
            variant={EmptyStateVariant.xs}
            className="sk-empty-container"
          >
            <EmptyStateIcon icon={SearchIcon} />

            <Title headingLevel="h4" size="md">
              No linked sites
            </Title>
            <EmptyStateBody>
              There are no sites linked to this site
            </EmptyStateBody>
            <EmptyStateSecondaryActions>
              <GetTokenModal {...this.props} noIcon />
            </EmptyStateSecondaryActions>
          </EmptyState>
        )}
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
                    noToolbar
                    excludeCurrent={false}
                    handleAddNotification={() => {}}
                    handleShowSubTable={this.handleShowSubTable}
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
