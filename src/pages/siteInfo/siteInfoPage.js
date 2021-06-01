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
import "./siteInfoPage.css";
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
import { Alert } from "@patternfly/react-core";
import { ALERT_TIMEOUT } from "../../qdrService";
import SiteInfoViewer from "./siteInfoViewer";
import MenuToggle from "./menuToggle";
import InlineEdit from "./inlineEdit";

import LastUpdated from "../../lastUpdated";

class SiteInfoPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      siteInfo: null,
      uploadStatus: null,
      uploadMsg: null,
      alerts: [],
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

  handleSiteNameChange = (name) => {
    if (name !== this.state.siteInfo.site_name) {
      this.props.service.renameSite(name).then(
        () => {
          const msg = `Site name changed successfully`;
          console.log(msg);
          this.addAlert({
            title: msg,
            variant: "success",
            isLiveRegion: true,
          });
        },
        (error) => {
          const msg = `Error renaming site - ${error.message}`;
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
    }
  };

  getUniqueId = () => new Date().getTime();

  addAlert = (alertProps) => {
    alertProps.key = this.getUniqueId();
    this.setState({ alerts: [...this.state.alerts, alertProps] });
  };

  handleStartEdit = () => {
    if (this.editRef) {
      this.editRef.triggerEdit();
    }
  };

  handleRegenCA = () => {
    this.props.service.regenCA().then(
      () => {
        const msg = `Request to regenerate Certificate Authority submitted`;
        console.log(msg);
        this.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error regerating Certificate Authority - ${error.message}`;
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

  update = () => {
    this.handleChangeLastUpdated();
    if (this.siteInfoRef) {
      this.siteInfoRef.update();
    }
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
    const { siteInfo, uploadStatus, uploadMsg, alerts } = this.state;
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
                      <InlineEdit
                        ref={(el) => {
                          this.editRef = el;
                        }}
                        name={siteInfo.site_name}
                        handleSiteNameChange={this.handleSiteNameChange}
                      />
                    </Text>
                  </TextContent>
                </SplitItem>
                <SplitItem isFilled></SplitItem>
                <SplitItem className="sk-siteinfo-actions">
                  <MenuToggle
                    handleStartEdit={this.handleStartEdit}
                    handleRegenCA={this.handleRegenCA}
                  />
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

              <SiteInfoViewer
                ref={(el) => (this.siteInfoRef = el)}
                {...this.props}
                handleAddNotification={() => {}}
                addAlert={this.addAlert}
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
