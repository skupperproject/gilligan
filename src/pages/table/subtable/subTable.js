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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbHeading,
} from "@patternfly/react-core";
import LastUpdated from "../../../lastUpdated";
//import SubHeading from "./subHeading";
import SubNav from "./subNav";
import SubDetails from "./subDetails";
import PopupCard from "../../../popupCard";
import PieBar from "../../topology/charts/pieBar";
import { viewsMap as VIEWS } from "../../topology/views/views";
import { Icap, viewFromHash } from "../../../utilities";

class SubTable extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.viewObj = new VIEWS[this.props.view](this.props.service);
    this.view = this.props.view;
  }

  componentDidMount = () => {
    const options = { item: this.props.info.value };
    this.viewObj.saveDetailOptions(options);
  };

  handleChangeLastUpdated = () => {
    this.updatedRef.update();
  };

  update = () => {
    //this.tableRef.update();
    this.handleChangeLastUpdated();
    if (this.pieRef1) this.pieRef1.doUpdate();
    if (this.pieRef2) this.pieRef2.doUpdate();
  };

  returnToTable = () => {
    this.props.handleChangeViewMode("table");
  };

  showTooltip = () => {};
  data = () => this.props.info.extraInfo.rowData.data.cardData;

  render() {
    const { options } = viewFromHash();
    console.log(`subTable props`);
    console.log(this.props);
    return (
      <React.Fragment>
        <StackItem className="sk-breadcrumbs">
          <Split gutter="md">
            <SplitItem>
              <Breadcrumb className="sk-breadcrumbList">
                <BreadcrumbItem onClick={this.returnToTable}>
                  {Icap(this.props.view)}s
                </BreadcrumbItem>
                <BreadcrumbHeading>{options.item}</BreadcrumbHeading>
              </Breadcrumb>
            </SplitItem>
            <SplitItem isFilled></SplitItem>
            <SplitItem>
              <TextContent>
                <LastUpdated ref={(el) => (this.updatedRef = el)} />
              </TextContent>
            </SplitItem>
          </Split>
        </StackItem>
        <StackItem className="sk-subtable">
          {this.props.info.extraInfo && (
            <Split>
              <SplitItem>
                <PopupCard
                  cardSize="expanded"
                  cardService={this.props.info.extraInfo.rowData.data.cardData}
                  card={this.props.info.card}
                  service={this.props.service}
                  inline
                  hideBody
                />
              </SplitItem>
              <SplitItem isFilled></SplitItem>
              <SplitItem id="sk-subTable-bar1">
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
                  containerId="sk-subTable-bar1"
                  data={this.data()}
                  showTooltip={this.showTooltip}
                  comment="Pie or bar chart for incoming metric"
                />
              </SplitItem>
              <SplitItem id="sk-subTable-bar2">
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
                  containerId="sk-subTable-bar2"
                  data={this.data()}
                  showTooltip={this.showTooltip}
                  comment="Pie or bar chart for incoming metric"
                />
              </SplitItem>
            </Split>
          )}
          {false && <SubNav view={this.props.view} />}
          <SubDetails {...this.props} />
        </StackItem>
      </React.Fragment>
    );
  }
}

export default SubTable;
