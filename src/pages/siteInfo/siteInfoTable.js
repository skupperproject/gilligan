import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableVariant,
} from "@patternfly/react-table";
import { utils } from "../../utilities";

class SiteInfoTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: [
        { title: "Name" },
        { title: "Status" },
        { title: "Use count" },
        { title: "Use limit" },
        { title: "Expires" },
        { title: "Created" },
      ],
      rows: [
        ["company-co-497c", "Active", "0", "1", "Never", "3 minutes ago"],
        ["company-co-497c", "Active", "-", "-", "In 6 hours", "2 days ago"],
        ["company-co-497c", "Revoked", "-", "-", "-", "2 days ago"],
      ],
      actions: [
        {
          title: "Download",
          onClick: (event, rowId, rowData, extra) =>
            console.log("clicked on download on row: ", rowId),
        },
        {
          title: "Revoke",
          onClick: (event, rowId, rowData, extra) =>
            console.log("clicked on revoke on row: ", rowId),
        },
      ],
    };
  }

  componentDidMount = () => {
    let columns = [];
    let rows = [];
    let cols = [];

    this.props.service.getSiteInfo().then((siteInfo) => {
      columns = this.props.columns;
      // get all possible column headings based on what is in the data
      const data = siteInfo[this.props.dataKey];
      /*
      data.forEach((datum) => {
        columns = [].concat(columns, Object.keys(datum));
      });
      columns = [...new Set(columns)];
      */

      // populate each row. if the token is missing the data, use "-"
      data.forEach((datum, i) => {
        rows[i] = [];
        columns.forEach((column) => {
          let name = column;
          let d = datum[name];
          let dateType = null;
          if (typeof column === "object") {
            name = column.name;
            dateType = column.dateType;
            if (datum[name] !== undefined && datum[name] !== "") {
              if (datum[name] === 0) {
                d = "Never";
              } else {
                d = utils.convertDate(datum[name], dateType);
                // if the date is past, but it should expire in the future
                if (!d && dateType === "future" && name === "Expires") {
                  const d1 = utils
                    .convertDate(datum[name], "past")
                    .toLowerCase();
                  d = `Expired ${d1}`;
                }
              }
            } else {
              d = undefined;
            }
          }
          if (d !== undefined) {
            rows[i].push(String([d]));
          } else {
            rows[i].push("-");
          }
          cols.push(name);
        });
      });
      cols = [...new Set(cols)];
      this.setState({ rows, columns: cols });
    });
  };

  render() {
    const { columns, rows } = this.state;
    const { actions } = this.props;

    return (
      <Table
        aria-label="Compact Table with borderless rows"
        variant={TableVariant.compact}
        borders={false}
        cells={columns}
        rows={rows}
        actions={actions}
        className="sk-compact-2"
      >
        <TableHeader />
        <TableBody />
      </Table>
    );
  }
}

export default SiteInfoTable;
