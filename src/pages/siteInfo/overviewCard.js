/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import { Card, CardBody, Label, Grid, Flex } from "@patternfly/react-core";
import { Split, SplitItem } from "@patternfly/react-core";
import { utils } from "../../utilities";

import {
  TableComposable,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@patternfly/react-table";
import { TableDefaults } from "@patternfly/react-table/dist/esm/components/Table/base";

class OverviewCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isCardExpanded: true, updateCount: 0 };

    this.onCardExpand = () => {
      this.setState({
        isCardExpanded: !this.state.isCardExpanded,
      });
    };

    this.onActionToggle = (isDropdownOpen) => {
      this.setState({
        isDropdownOpen,
      });
    };

    this.onActionSelect = (event) => {
      this.setState({
        isDropdownOpen: !this.state.isDropdownOpen,
      });
    };
  }

  update = () => {
    // hack to force the component to rerender after each update
    this.setState({ updateCount: this.state.updateCount + 1 });
  };

  render() {
    const { updateCount } = this.state;
    const residentServices = this.props.service.VAN.deployments
      .filter((d) => !d.service.derived)
      .sort((a, b) =>
        a.site.site_name < b.site.site_name
          ? -1
          : a.site.site_name > b.site.site_name
          ? 1
          : 0
      );
    const serviceCount = residentServices.length;
    const serviceColumns = ["Name", "Protocol", "Site"];
    const serviceRows = residentServices.map((deployment) => [
      deployment.service.address,
      deployment.service.protocol,
      deployment.site.site_name,
    ]);

    const siteRows = this.props.service.VAN.sites
      .filter((s) => !s.gateway)
      .map((site) => [site.site_name, site.namespace, site.version])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const siteColumns = ["Site name", "Namespace", "version"];
    const siteCount = siteRows.length;

    let gatewayRows = this.props.service.VAN.sites
      .filter((s) => s.gateway)
      .map((gateway) => [
        gateway.site_name,
        gateway.version,
        gateway.parent_site.site_name,
        gateway.type,
      ])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const gatewayCount = gatewayRows.length;
    let gatewayColumns = ["Name", "Version", "Parent site", "Type"];

    // If none of the gateway records have a type,
    // remove the Type column
    // TODO: remove this after gateway type is available
    // r[3] is the gateway.type column
    const hasType = gatewayRows.some((r) => r[3] !== undefined);
    if (!hasType) {
      gatewayRows.forEach((r) => r.pop());
      gatewayColumns.pop();
    }

    const tables = [
      {
        count: siteCount,
        columns: siteColumns,
        rows: siteRows,
        label: (
          <Label color="blue">
            {siteCount} {`${siteCount > 1 ? "Linked s" : "S"}`}
            {utils.safePlural(siteCount, "ite")}
          </Label>
        ),
      },
      {
        count: serviceCount,
        columns: serviceColumns,
        rows: serviceRows,
        label: (
          <Label color="purple">
            {serviceCount} Exposed{" "}
            {utils.safePlural(serviceCount, "deployment")}
          </Label>
        ),
      },
      {
        count: gatewayCount,
        columns: gatewayColumns,
        rows: gatewayRows,
        label: (
          <Label color="green">
            {gatewayCount} {utils.safePlural(gatewayCount, "gateway")}
          </Label>
        ),
      },
    ];

    return (
      <Card isCompact isPlain>
        <CardBody>
          <Split hasGutter isWrappable>
            {tables.map((table) => (
              <SplitItem>
                <Flex
                  spaceItems={{ default: "spaceItemsLg" }}
                  alignItems={{ default: "alignItemsFlexStart" }}
                  direction={{ default: "column" }}
                >
                  {table.label}
                  <TableComposable
                    aria-label="Simple table"
                    variant="compact"
                    borders={false}
                  >
                    <Thead>
                      <Tr>
                        {table.columns.map((column, columnIndex) => (
                          <Th key={columnIndex} width={30}>
                            {column}
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {table.rows.map((row, rowIndex) => (
                        <Tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <Td
                              key={`${rowIndex}_${cellIndex}`}
                              dataLabel={table.columns[cellIndex]}
                            >
                              {cell}
                            </Td>
                          ))}
                        </Tr>
                      ))}
                    </Tbody>
                  </TableComposable>
                </Flex>
              </SplitItem>
            ))}
          </Split>
          {updateCount ? <span /> : <span />}
        </CardBody>
      </Card>
    );
  }
}

export default OverviewCard;
