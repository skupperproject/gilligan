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
import { pretty } from "../../utilities";

class LinkInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  routerToRouter = () => {
    return (
      <React.Fragment>
        <div>source: {this.props.linkInfo.source.site_name}</div>
        <div>target: {this.props.linkInfo.target.site_name}</div>
      </React.Fragment>
    );
  };

  render() {
    const obj2Str = (k, value) => {
      let val;
      if (k === "start_time" || k === "last_in" || k === "last_out") {
        const options = {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        };
        val = new Date(value).toLocaleDateString("en-US", options);
      } else if (typeof value === "object") {
        val = JSON.stringify(value, null, 2);
      } else {
        val = pretty(this.props.linkInfo.request[k]);
      }
      return val;
    };
    const getProtocol = (title) => {
      if (this.props.linkInfo.target.protocol) {
        return title ? "Protocol" : this.props.linkInfo.target.protocol;
      }
      let protocols = [];
      if (this.props.linkInfo.request.requests) {
        protocols.push("http");
      }
      if (this.props.linkInfo.request.start_time) {
        protocols.push("tcp");
      }
      return title
        ? `Protocol${protocols.length > 1 ? "s" : ""}`
        : protocols.join(", ");
    };
    const whichInfo = () => {
      //if (this.props.linkInfo.source.site_id) {
      //  return this.routerToRouter();
      //}
      return (
        <table>
          <tbody>
            <tr>
              <td>{getProtocol(true)}</td>
              <td>{getProtocol()}</td>
            </tr>
            {Object.keys(this.props.linkInfo.request).map((k) => {
              if (k !== "by_handling_site") {
                let val = obj2Str(k, this.props.linkInfo.request[k]);
                return (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{val}</td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </table>
      );
    };
    return <div className="link-info">{whichInfo()}</div>;
  }
}

export default LinkInfo;
