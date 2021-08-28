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

import React, { Component } from "react";
import "./subTable.css";
import { StackItem, TextContent } from "@patternfly/react-core";
import { Split, SplitItem } from "@patternfly/react-core";
import { Flex, FlexItem } from "@patternfly/react-core";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbHeading,
} from "@patternfly/react-core";
import LastUpdated from "../../../lastUpdated";
import SubDetails from "./subDetails";
import PopupCard from "../../../popupCard";
import PieBar from "../../topology/charts/pieBar";
import TimeSeries from "../../topology/charts/timeSeries";
import ChordViewer from "../../topology/chord/chordViewer";
import SiteModal from "../../topology/cards/siteModal";
import QDRPopup from "../../../qdrPopup";
import { viewsMap as VIEWS } from "../../topology/views/views";
import { utils } from "../../../utilities";

class SubTable extends Component {
  constructor(props) {
    super(props);
    this.state = { popupContent: null };
    this.view = this.props.view === "thissite" ? "site" : this.props.view;
    this.viewObj = new VIEWS[this.view](this.props.service);
  }

  componentDidMount = () => {
    const options = { item: this.props.info.value };
    this.viewObj.saveDetailOptions(options);
    if (this.chordRef && this.chordRef.init) {
      this.chordRef.init();
    }
  };

  handleChangeLastUpdated = () => {
    if (this.updatedRef) {
      this.updatedRef.update();
    }
  };

  update = () => {
    this.handleChangeLastUpdated();
    if (this.pieRef1) this.pieRef1.doUpdate();
    if (this.pieRef2) this.pieRef2.doUpdate();
    if (this.lineRef1) this.lineRef1.doUpdate();
    if (this.lineRef2) this.lineRef2.doUpdate();
    if (this.chordRef) this.chordRef.doUpdate();
    if (this.modalRef) this.modalRef.doUpdate(this.props);
  };

  returnToView = (mode) => {
    this.props.handleChangeViewMode(mode, true, this.props.origin);
  };

  showTooltip = (content, eventX, eventY) => {
    if (!content && !this.state.popupContent) {
      return;
    }
    this.setState({ popupContent: content }, () => {
      if (content) {
        // after the content has rendered, position it
        utils.positionPopup({
          containerSelector: "#skSubtableCharts",
          popupSelector: "#popover-div",
          constrainY: false,
          eventX,
          eventY,
        });
      }
    });
  };

  data = () =>
    this.props.data
      ? this.props.data
      : this.props.info.extraInfo
      ? this.props.info.extraInfo.rowData.data.cardData
      : null;

  anyRequests = (direction) => {
    const data = this.data();
    if (!data) return false;
    let address = data ? data.address : null;
    let site_name = null;
    if (this.props.view === "deployment") {
      if (data.address) {
        site_name = data.cluster.site_name;
      } else {
        site_name = data.site_name;
      }
    } else if (this.props.view === "site" && !data.address) {
      address = data.site_id;
    }
    const requests = this.viewObj.specificTimeSeries({
      VAN: this.props.service.VAN,
      direction,
      stat: direction === "in" ? "bytes_in" : "bytes_out",
      duration: "min",
      address,
      site_name,
    });
    return Object.keys(requests).length > 0;
  };

  chordName = (data) => {
    if (this.props.view === "deployment" && data.address) {
      return `${utils.shortName(data.address)} (${data.cluster.site_name})`;
    }
    return data.nodeType === "cluster"
      ? data.name
      : utils.shortName(data.address);
  };

  render() {
    const { options } = utils.viewFromHash();
    const data = this.data();
    if (!data) return null;
    const hasIn = this.anyRequests("in");
    const hasOut = this.anyRequests("out");
    const { popupContent } = this.state;

    const deploymentLinks = () =>
      data.nodeType === "cluster"
        ? []
        : this.props.service.adapter
            .getDeploymentLinks()
            .filter(
              (l) =>
                l.source.service.address === data.address ||
                l.target.service.address === data.address
            );

    const breadcrumb = () => {
      if (this.props.data) {
        return (
          <Breadcrumb className="sk-breadcrumbList">
            <BreadcrumbItem onClick={() => this.returnToView("graph")}>
              {utils.Icap(this.props.view)}s
            </BreadcrumbItem>
            <BreadcrumbHeading>
              {data.nodeType === "cluster"
                ? data.name
                : utils.shortName(data.address)}
            </BreadcrumbHeading>
          </Breadcrumb>
        );
      }
      return (
        <Breadcrumb className="sk-breadcrumbList">
          <BreadcrumbItem onClick={() => this.returnToView("table")}>
            {utils.Icap(
              this.props.view === "site" ? "network" : `${this.props.view}s`
            )}
          </BreadcrumbItem>
          <BreadcrumbHeading>{options.item}</BreadcrumbHeading>
        </Breadcrumb>
      );
    };
    return (
      <React.Fragment>
        <StackItem className="sk-breadcrumbs">
          <Split gutter="md">
            <SplitItem>{breadcrumb()}</SplitItem>
            <SplitItem isFilled></SplitItem>
            <SplitItem>
              <TextContent>
                <LastUpdated ref={(el) => (this.updatedRef = el)} />
              </TextContent>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem
          className="sk-subtable-content"
          id="skSubtableCharts"
          data-testid={`data-testid_${this.props.view}_${
            data.nodeType === "cluster"
              ? data.name
              : utils.shortName(data.address)
          }`}
        >
          <div
            id="popover-div"
            className={
              popupContent ? "sk-popover-div" : "sk-popover-div hidden"
            }
            ref={(el) => (this.popupRef = el)}
          >
            <QDRPopup content={popupContent}></QDRPopup>
          </div>

          {data && (
            <React.Fragment>
              <Flex direction={{ default: "column", lg: "row" }}>
                {this.props.info.card && (
                  <FlexItem>
                    <PopupCard
                      cardSize="expanded"
                      cardService={data}
                      card={this.props.info.card}
                      service={this.props.service}
                      inline
                      hideBody
                    />
                  </FlexItem>
                )}
              </Flex>
              <Flex
                className="sk-charts-sections"
                direction={{ default: "column", lg: "row" }}
              >
                {hasIn && (
                  <FlexItem id="sk-subTable-line1">
                    <TimeSeries
                      ref={(el) => (this.lineRef1 = el)}
                      service={this.props.service}
                      site={
                        this.props.view === "site" ||
                        this.props.view === "deployment"
                      }
                      deployment={this.props.view === "deployment"}
                      stat="bytes_in"
                      direction="in"
                      type="line"
                      viewObj={this.viewObj}
                      containerId="sk-subTable-line1"
                      data={data}
                      showTooltip={this.showTooltip}
                      comment="Line chart for incoming metric"
                    />
                  </FlexItem>
                )}
                {hasOut && (
                  <FlexItem id="sk-subTable-line2">
                    <TimeSeries
                      ref={(el) => (this.lineRef2 = el)}
                      service={this.props.service}
                      site={
                        this.props.view === "site" ||
                        this.props.view === "deployment"
                      }
                      deployment={this.props.view === "deployment"}
                      stat="bytes_out"
                      direction="out"
                      type="line"
                      viewObj={this.viewObj}
                      containerId="sk-subTable-line2"
                      data={data}
                      showTooltip={this.showTooltip}
                      comment="LIne chart for outgoing metric"
                    />
                  </FlexItem>
                )}
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
                      stat="bytes_in"
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
                {(hasIn || hasOut) && (
                  <div
                    id="skModalskAllCharts"
                    className="sk-subtable-chord-container"
                  >
                    <div className="sk-chart-header">{`Site to site traffic for ${this.chordName(
                      data
                    )}`}</div>
                    <FlexItem id="sk-subTable-chord">
                      <ChordViewer
                        ref={(el) => (this.chordRef = el)}
                        {...this.props}
                        site
                        deployment={this.props.view === "deployment"}
                        prefix="skModal"
                        containerId="skModalskAllCharts"
                        noLegend
                        handleArcOver={() => {}}
                        handleChordOver={() => {}}
                        showTooltip={this.showTooltip}
                        deploymentLinks={deploymentLinks()}
                        data={data}
                        site2site
                        noHeader
                        stat="bytes_out"
                        initial
                      />
                    </FlexItem>
                    <SiteModal
                      ref={(el) => (this.modalRef = el)}
                      {...this.props}
                      data={data}
                      comment="Full page chord chart"
                    />
                  </div>
                )}
              </Flex>
            </React.Fragment>
          )}
          <SubDetails {...this.props} />
        </StackItem>
      </React.Fragment>
    );
  }
}

export default SubTable;
