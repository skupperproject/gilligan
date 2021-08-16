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
import { render, fireEvent } from "@testing-library/react";
import TableViewer from "./tableViewer";
import { QDRService } from "../../qdrService";

const service = new QDRService();
const props = {
  mode: "table",
  service,
};

it("renders the service table view", () => {
  props.setOptions = jest.fn();
  props.handleShowSubTable = jest.fn();
  props.view = "service";

  return service.connect().then(async () => {
    const { queryByTestId } = await render(<TableViewer {...props} />);
    expect(queryByTestId(/data-testid_service/i)).toBeTruthy();
    const cartservice = queryByTestId(/cartservice/i);
    expect(cartservice).toBeTruthy();
    fireEvent.click(cartservice);
    expect(props.handleShowSubTable).toHaveBeenCalled();
    expect(props.setOptions).toHaveBeenCalled();
  });
});

it("renders the site table view", () => {
  props.setOptions = jest.fn();
  props.handleShowSubTable = jest.fn();
  props.view = "site";

  return service.connect().then(async () => {
    const { queryByTestId } = await render(<TableViewer {...props} />);
    expect(queryByTestId(/data-testid_site/i)).toBeTruthy();
    const mini1 = queryByTestId(/mini1/i);
    expect(mini1).toBeTruthy();
    fireEvent.click(mini1);
    expect(props.handleShowSubTable).toHaveBeenCalled();
    expect(props.setOptions).toHaveBeenCalled();
  });
});

it("renders the deployment table view", () => {
  props.setOptions = jest.fn();
  props.handleShowSubTable = jest.fn();
  props.view = "deployment";

  return service.connect().then(async () => {
    const { queryByTestId } = await render(<TableViewer {...props} />);
    expect(queryByTestId(/data-testid_deployment/i)).toBeTruthy();
    const cartservice = queryByTestId("site-b/cartservice");
    expect(cartservice).toBeTruthy();
    fireEvent.click(cartservice);
    expect(props.handleShowSubTable).toHaveBeenCalled();
    expect(props.setOptions).toHaveBeenCalled();
  });
});
