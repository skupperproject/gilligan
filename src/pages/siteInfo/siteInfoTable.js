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
      rows: [],
      columns: [],
      empty: false,
    };
  }

  getColumnNames = (columns) =>
    columns.map((column) =>
      typeof column === "object"
        ? column.title
          ? column.title
          : column.name
        : column
    );

  updateColumns = () => {
    this.setState({ columns: this.getColumnNames(this.props.columns) });
  };

  componentDidUpdate = (prevProps) => {
    // if the passed in columns array has changed, update the state
    let needToUpdate = false;
    const currColumns = this.getColumnNames(this.props.columns);
    const prevColumns = this.getColumnNames(prevProps.columns);
    if (currColumns.length !== prevColumns.length) {
      needToUpdate = true;
    } else {
      const combinedColumns = [...new Set([...currColumns, ...prevColumns])];
      if (combinedColumns.length !== prevColumns.length) {
        needToUpdate = true;
      }
    }
    if (needToUpdate) {
      this.updateColumns();
    }
  };

  componentDidMount = () => {
    this.update();
  };

  update = () => {
    let rows = [];

    this.props.service.getSiteInfo().then((siteInfo) => {
      let columns = this.props.columns;
      let data = siteInfo[this.props.dataKey];
      if (this.props.includeCurrent) {
        data = [
          {
            name: siteInfo.site_name,
            site_id: siteInfo.site_id,
            Status: "OK",
            "Site type": siteInfo["Site type"],
            Cost: "",
          },
          ...data,
        ];
      }

      // populate each row. if the token is missing the data, use "-"
      if (data) {
        data.forEach((datum, i) => {
          rows[i] = {
            cells: [],
            actionProps: {
              data: {
                site_name: datum.name,
                site_id: datum.site_id ? datum.site_id : datum.ID,
              },
            },
          };
          columns.forEach((column) => {
            let name = column;
            let d = datum[name];
            let dateType = null;
            if (typeof column === "object") {
              if (column.dateType) {
                name = column.name;
                dateType = column.dateType;
                const date = new Date(datum[name]);
                if (datum[name] !== undefined && datum[name] !== "") {
                  if (datum[name] === 0) {
                    d = "Never";
                  } else {
                    d = utils.convertDate(date, dateType);
                    // if the date is past, but it should expire in the future
                    if (
                      !d &&
                      dateType === "future" &&
                      name === "claimExpiration"
                    ) {
                      const d1 = utils.convertDate(date, "past").toLowerCase();
                      d = `Expired ${d1}`;
                    }
                  }
                } else {
                  d = undefined;
                }
              } else {
                d = datum[column.name];
              }
            }
            if (d !== undefined) {
              rows[i].cells.push(String([d]));
            } else {
              rows[i].cells.push("-");
            }
          });
        });
      }
      this.setState({
        rows: rows.length > 0 ? rows : this.props.emptyRows,
        columns: this.getColumnNames(this.props.columns),
        empty: rows.length === 0,
      });
    });
  };

  render() {
    const { columns, rows, empty } = this.state;
    const { actions } = this.props;

    return (
      <Table
        aria-label="Compact Table with borderless rows"
        variant={TableVariant.compact}
        borders={false}
        cells={columns}
        rows={rows}
        actions={empty ? [] : actions}
        className="sk-compact-2"
        actionResolver={this.props.actionResolver}
      >
        <TableHeader />
        <TableBody />
      </Table>
    );
  }
}

export default SiteInfoTable;
