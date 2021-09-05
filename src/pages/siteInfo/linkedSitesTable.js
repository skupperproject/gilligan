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
import UnlinkModal from "./unlinkModal";
import TableViewer from "../table/tableViewer";
import { LinksRows } from "./linksRows";
import EmptyLinkState from "./emptyLinkState";

class LinkedSitesTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showUnlinkModal: false,
      unlinkInfo: null,
      linkCount: this.props.service.siteInfo.links.length,
    };
    this.actions = [
      {
        title: "Unlink",
        onClick: (event, rowId, rowData, extra) => this.showUnlink(rowData),
      },
    ];

    // helper that fetches the table data and defines the table columns
    this.linksData = new LinksRows();
  }

  componentDidMount = () => {
    this.mounted = true;
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  // called periodically by the parent component
  update = () => {
    this.setState(
      { linkCount: this.props.service.siteInfo.links.length },
      () => {
        if (this.tableRef && this.tableRef.update) {
          this.tableRef.update();
        }
      }
    );
  };

  // called after a link name is clicked in the links table
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

  // called by tableViewer to get the rows to display
  fetchLinks = (page, perPage) => {
    const formatterData = {
      unLink: this.showUnLink,
    };
    return new Promise((resolve) => {
      this.linksData
        .fetch(<EmptyLinkState />, this.props.service, formatterData)
        .then((data) => {
          if (this.props.dataFilter) {
            data = this.props.dataFilter(data);
          }
          resolve({
            data,
            page,
            perPage,
          });
        });
    });
  };

  addAlert = (alertProps) => {
    if (this.props.addAlert) {
      this.props.addAlert(alertProps);
    }
  };

  showUnlink = (rowData) => {
    this.setState({
      showUnlinkModal: true,
      unlinkInfo: {
        name: rowData.data.Name,
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
        const msg = `Site ${unlinkInfo.name} unlinked successfully`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        if (!this.mounted) return;
        const msg = `Error unlinking site ${unlinkInfo.name} - ${error.message}`;
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

  linkFields = () => {
    if (this.props.fieldsFilter) {
      return this.props.fieldsFilter(this.linksData.LinkFields);
    }
    return this.linksData.LinkFields;
  };

  // called by patternfly's table component
  // only put the menu item to unlink on table rows that have a status of connected
  actionResolver = (rowData) => {
    return this.actions;
  };

  render() {
    const { showUnlinkModal, unlinkInfo, linkCount } = this.state;
    return (
      <div>
        {showUnlinkModal && (
          <UnlinkModal
            {...this.props}
            unlinkInfo={unlinkInfo}
            handleModalClose={this.handleUnlinkClose}
            doUnlink={this.doUnlink}
          />
        )}
        {linkCount === 0 && <EmptyLinkState />}
        {linkCount > 0 && (
          <TableViewer
            ref={(el) => (this.tableRef = el)}
            {...this.props}
            view="site"
            fields={this.linkFields()}
            doFetch={this.fetchLinks}
            noToolbar
            noFormat
            excludeCurrent={false}
            handleAddNotification={() => {}}
            handleShowSubTable={this.handleShowSubTable}
            actionResolver={
              this.props.actionResolver
                ? this.props.actionResolver
                : this.actionResolver
            }
          />
        )}
      </div>
    );
  }
}

export default LinkedSitesTable;
