/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import { Card, CardBody, Label, Grid, Flex } from "@patternfly/react-core";

import {
  TableComposable,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from "@patternfly/react-table";

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

    const siteColumns = ["Site name", "Namespace", "version"];
    const siteRows = this.props.service.VAN.sites
      .map((site) => [site.site_name, site.namespace, site.version])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    return (
      <Card isCompact isPlain>
        <CardBody>
          <Grid md={6} lg={3} hasGutter>
            <Flex
              spaceItems={{ default: "spaceItemsLg" }}
              alignItems={{ default: "alignItemsFlexStart" }}
              direction={{ default: "column" }}
            >
              <Label color="blue">
                {this.props.service.VAN.sites.length} Site
                {`${this.props.service.VAN.sites.length !== 1 ? "s" : ""}`}
              </Label>
              <TableComposable
                aria-label="Simple table"
                variant="compact"
                borders={false}
              >
                <Thead>
                  <Tr>
                    {siteColumns.map((column, columnIndex) => (
                      <Th key={columnIndex}>{column}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {siteRows.map((row, rowIndex) => (
                    <Tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <Td
                          key={`${rowIndex}_${cellIndex}`}
                          dataLabel={siteColumns[cellIndex]}
                        >
                          {cell}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </TableComposable>
            </Flex>
            <Flex
              spaceItems={{ default: "spaceItemsLg" }}
              alignItems={{ default: "alignItemsFlexStart" }}
              direction={{ default: "column" }}
            >
              <Label color="purple">
                {serviceCount} Deployment
                {`${serviceCount !== 1 ? "s" : ""}`}
              </Label>
              <TableComposable
                aria-label="Simple table"
                variant="compact"
                borders={false}
              >
                <Thead>
                  <Tr>
                    {serviceColumns.map((column, columnIndex) => (
                      <Th key={columnIndex}>{column}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {serviceRows.map((row, rowIndex) => (
                    <Tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <Td
                          key={`${rowIndex}_${cellIndex}`}
                          dataLabel={serviceColumns[cellIndex]}
                        >
                          {cell}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </TableComposable>
            </Flex>
          </Grid>
          {updateCount ? <span /> : <span />}
        </CardBody>
      </Card>
    );
  }
}

export default OverviewCard;
