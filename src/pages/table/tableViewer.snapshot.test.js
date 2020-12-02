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

const handleShowSubTable = jest.fn();
const setOptions = jest.fn();
const service = new QDRService();
const props = {
  view: "service",
  mode: "table",
  service,
  setOptions,
  handleShowSubTable,
};

it("matches service table snapshot", () => {
  return service.connect().then(async () => {
    const { queryByTestId } = await render(<TableViewer {...props} />);
    const page = queryByTestId(/data-testid_service/i).outerHTML;
    expect(page).toMatchSnapshot();
  });
});

it("matches site table snapshot", () => {
  props.view = "site";
  return service.connect().then(async () => {
    const { queryByTestId } = await render(<TableViewer {...props} />);
    const page = queryByTestId(/data-testid_site/i).outerHTML;
    expect(page).toMatchSnapshot();
  });
});

it("matches deployment table snapshot", () => {
  props.view = "deployment";
  return service.connect().then(async () => {
    const { queryByTestId } = await render(<TableViewer {...props} />);
    const page = queryByTestId(/data-testid_deployment/i).outerHTML;
    expect(page).toMatchSnapshot();
  });
});
