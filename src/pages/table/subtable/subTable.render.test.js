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
import { render } from "@testing-library/react";
import SubTable from "./subTable";
import { QDRService } from "../../../qdrService";
import { Service } from "../../topology/views/service";
import { Site } from "../../topology/views/site";
import { Deployment } from "../../topology/views/deployment";

const service = new QDRService();
const props = {
  mode: "subtable",
  service,
};

it("renders the subtable view for service.cartservice", () => {
  props.view = "service";

  return service.connect().then(async () => {
    const viewObj = new Service(service);
    props.info = { card: viewObj.card };
    const viewer = {
      statForProtocol: jest.fn(),
      state: { options: { showExternal: false } },
    };
    viewObj.initNodesAndLinks(viewer);
    props.data = viewObj.serviceNodes.nodes.find(
      (n) => n.address === "cartservice"
    );
    const { queryByTestId } = await render(<SubTable {...props} />);
    expect(queryByTestId(/data-testid_service_cartservice/i)).toBeTruthy();
  });
});

it("renders the subtable view for site.mini1", () => {
  props.view = "site";

  return service.connect().then(async () => {
    const viewObj = new Site(service);
    props.info = { card: viewObj.card };
    const viewer = {
      statForProtocol: jest.fn(),
      state: { options: { showExternal: false } },
    };
    viewObj.initNodesAndLinks(viewer);
    props.data = viewObj.siteNodes.nodes.find((n) => n.site_name === "mini1");
    const { queryByTestId } = await render(<SubTable {...props} />);
    expect(queryByTestId(/data-testid_site_mini1/i)).toBeTruthy();
  });
});

it("renders the subtable view for deployment.cartservice", () => {
  props.view = "deployment";

  return service.connect().then(async () => {
    const viewObj = new Deployment(service);
    props.info = { card: viewObj.card };
    const viewer = {
      statForProtocol: jest.fn(),
      state: { options: { showExternal: false } },
    };
    viewObj.initNodesAndLinks(viewer);
    console.log(viewObj.serviceNodes.nodes);
    props.data = viewObj.serviceNodes.nodes.find(
      (n) => n.address === "cartservice"
    );
    const { queryByTestId } = await render(<SubTable {...props} />);
    expect(queryByTestId(/data-testid_deployment_cartservice/i)).toBeTruthy();
  });
});
