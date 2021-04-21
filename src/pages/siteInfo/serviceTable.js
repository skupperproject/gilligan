import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableVariant,
  cellWidth,
} from "@patternfly/react-table";

class ServiceTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: [
        { title: "Service", transforms: [cellWidth(40)] },
        { title: "Protocol", transforms: [cellWidth(20)] },
        { title: "", transforms: [cellWidth("max")] },
      ],
      rows: this.props.service.VAN.services.map((s) => [s.address, s.protocol]),
    };
  }

  render() {
    const { columns, rows } = this.state;

    return (
      <Table
        aria-label="Compact Table with borderless rows"
        variant={TableVariant.compact}
        borders={false}
        cells={columns}
        rows={rows}
        className="sk-compact"
      >
        <TableHeader />
        <TableBody />
      </Table>
    );
  }
}

export default ServiceTable;
