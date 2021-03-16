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
        { title: "Service", transforms: [cellWidth(10)] },
        { title: "Connection URL", transforms: [cellWidth(20)] },
        { title: "", transforms: [cellWidth("max")] },
      ],
      rows: [
        ["frontend", "http://frontend:8080", ""],
        ["inventory", "http://inventory:8080", ""],
        ["orders", "http://orders:8080", ""],
        ["database", "jdbc://database:5432", ""],
        ["reviews", "http://reviews:8080", ""],
      ],
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
