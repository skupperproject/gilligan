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
import {
  PageSection,
  PageSectionVariants,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from "@patternfly/react-core";
import { Split, SplitItem } from "@patternfly/react-core";
import SiteInfoViewer from "./siteInfoViewer";
import DownloadModal from "./downloadModal";
import "./siteInfoPage.css";

import LastUpdated from "../../lastUpdated";

class SiteInfoPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      siteInfo: null,
      uploadStatus: null,
      uploadMsg: null,
    };
  }

  componentDidMount = () => {
    this.props.service.getSiteInfo().then(
      (siteInfo) => {
        this.setState({ siteInfo });
      },
      (error) => {
        console.log(`site info error ${error}`);
      }
    );
  };
  handleChangeLastUpdated = () => {
    if (this.updatedRef) this.updatedRef.update();
  };

  update = () => {
    this.handleChangeLastUpdated();
  };

  onFileChange = (event) => {
    const file = event.target.files[0];
    let data = new FormData();
    data.append("file", file);
    console.log(file);
    console.log(data);
    this.props.service.uploadToken(data).then(
      (response) => {
        if (response.status < 200 || response.status > 299) {
          this.setState({
            uploadMsg: `${response.url} returned ${response.statusText}`,
            uploadStatus: response.status,
          });
        }
        console.log("normal response");
        console.log(response);
      },
      (error) => console.log(`error response ${error}`)
    );
  };

  render() {
    const { siteInfo, uploadStatus, uploadMsg } = this.state;
    if (!siteInfo) return <div>Please wait...</div>;
    return (
      <PageSection variant={PageSectionVariants.light} className="table-page">
        <Stack>
          <React.Fragment>
            <StackItem className="overview-header">
              <Split gutter="md">
                <SplitItem>
                  <TextContent>
                    <Text className="overview-title" component={TextVariants.p}>
                      <span className="sk-siteinfo-prompt">Site</span>
                      {siteInfo.site_name}
                    </Text>
                  </TextContent>
                </SplitItem>
                <SplitItem isFilled></SplitItem>
                <SplitItem className="sk-siteinfo-actions">
                  <DownloadModal {...this.props} cls="sk-none" />
                  <div className="container">
                    <div className="button-wrap">
                      <label className="button" htmlFor="upload">
                        Upload a link token
                      </label>
                      <input
                        onChange={this.onFileChange}
                        id="upload"
                        type="file"
                      />
                    </div>
                  </div>

                  <TextContent>
                    <span
                      className={`sk-upload-status ${
                        uploadStatus !== 200 ? "error" : "success"
                      }`}
                    >
                      {uploadMsg}
                    </span>

                    <LastUpdated ref={(el) => (this.updatedRef = el)} />
                  </TextContent>
                </SplitItem>
              </Split>
            </StackItem>
            <StackItem className="sk-site-info-table">
              <SiteInfoViewer
                ref={(el) => (this.siteInfoRef = el)}
                service={this.props.service}
                view={this.props.view}
                handleAddNotification={() => {}}
                history={this.props.history}
                siteInfo={siteInfo}
              />
            </StackItem>
          </React.Fragment>
        </Stack>
      </PageSection>
    );
  }
}

export default SiteInfoPage;
