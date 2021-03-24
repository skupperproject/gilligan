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

class UploadButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = { uploadMsg: null, uploadStatus: null };
  }

  update = () => {};

  onFileChange = (event) => {
    const file = event.target.files[0];
    let data = new FormData();
    data.append("file", file);
    console.log(file);
    console.log(data);
    this.props.service.uploadToken(data).then(
      (response) => {
        if (!this.mounted) return;
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
    const { uploadStatus, uploadMsg } = this.state;
    return (
      <div className="container">
        <div className="button-wrap">
          <label className="button" htmlFor="upload">
            Upload a link token
          </label>
          <input onChange={this.onFileChange} id="upload" type="file" />
        </div>
        <span
          className={`sk-upload-status ${
            uploadStatus !== 200 ? "error" : "success"
          }`}
        >
          {uploadMsg}
        </span>
      </div>
    );
  }
}

export default UploadButton;
