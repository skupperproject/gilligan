import React from "react";
import TableViewer from "../table/tableViewer";

class ServiceTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleShowSubTable = (_, subPageInfo) => {
    this.props.handleViewDetails(
      "details",
      subPageInfo,
      subPageInfo.card,
      "overview"
    );
    const options = {
      view: this.props.view,
      mode: "details",
      item: subPageInfo.value,
    };
    this.props.setOptions(options, true);
  };

  render() {
    return (
      <div className="sk-site-table-wrapper">
        <TableViewer
          ref={(el) => (this.tableRef = el)}
          {...this.props}
          view="service"
          noToolbar
          excludeCurrent={false}
          handleAddNotification={() => {}}
          handleShowSubTable={this.handleShowSubTable}
        />
      </div>
    );
  }
}

export default ServiceTable;
