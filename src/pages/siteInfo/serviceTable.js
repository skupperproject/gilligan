import React from "react";
import {
  Title,
  EmptyState,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateBody,
  EmptyStateSecondaryActions,
} from "@patternfly/react-core";
import SearchIcon from "@patternfly/react-icons/dist/js/icons/search-icon";

import TableViewer from "../table/tableViewer";
import UnexposeModal from "./unexposeModal";
import ExposeModal from "./exposeModal";
import { DeploymentRows } from "./deploymentRows";

class ServiceTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      unexposeInfo: null,
      showUnexposeModal: false,
      exposeInfo: null,
      showExposeModal: false,
    };
    this.actions = [
      {
        title: "Unexpose",
        onClick: (event, rowId, rowData, extra) => this.showUnexpose(rowData),
      },
      {
        title: "Expose",
        onClick: (event, rowId, rowData, extra) => this.showExpose(rowData),
      },
    ];
    this.deploymentData = new DeploymentRows();
  }

  update = () => {
    if (this.tableRef && this.tableRef.update) {
      this.tableRef.update();
    }
  };

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

  emptyState = () => (
    <EmptyState variant={EmptyStateVariant.xs} className="sk-empty-container">
      <EmptyStateIcon icon={SearchIcon} />

      <Title headingLevel="h4" size="md">
        No services
      </Title>
      <EmptyStateBody>
        There are no services running at this site.
      </EmptyStateBody>
      <EmptyStateSecondaryActions></EmptyStateSecondaryActions>
    </EmptyState>
  );

  showDetail = (rowData) => {
    this.handleShowSubTable(null, {
      ...rowData,
      value: rowData.data.Name,
      card: rowData.data.cardData,
    });
  };

  fetchDeployments = (page, perPage) => {
    const formatterData = { expose: this.showExpose, details: this.showDetail };
    return new Promise((resolve) => {
      this.deploymentData
        .fetch(this.emptyState(), this.props.service, formatterData)
        .then((data) => {
          resolve({ data, page, perPage });
        });
    });
  };

  showUnexpose = (rowData) => {
    const service_name = rowData.data.Name;
    const service_id = rowData.data.ID;
    this.setState({
      showUnexposeModal: true,
      // data sent to REST call
      unexposeInfo: {
        Name: service_name,
        service_id: service_id,
      },
    });
  };

  handleUnexposeClose = () => {
    this.setState({ showUnexposeModal: false, unexposeInfo: null });
  };

  doUnexpose = (unexposeInfo) => {
    this.props.service.unexposeService(unexposeInfo).then(
      () => {
        const msg = `Site ${unexposeInfo.Name} unexposed successfully`;
        console.log(msg);
        this.props.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error unlinking site ${unexposeInfo.Name} - ${error.message}`;
        console.error(msg);
        this.props.addAlert({
          title: msg,
          variant: "danger",
          ariaLive: "assertive",
          ariaRelevant: "additions text",
          ariaAtomic: "false",
        });
      }
    );
  };

  showExpose = (rowData) => {
    const service_name = rowData.data.Name;
    const service_id = rowData.data.ID;
    this.setState({
      showExposeModal: true,
      exposeInfo: {
        Name: service_name,
        service_id: service_id,
        Port: rowData.data.Port,
      },
    });
  };

  handleExposeClose = () => {
    this.setState({ showExposeModal: false, exposeInfo: null });
  };

  doExpose = (exposeInfo) => {
    this.props.service.exposeService(exposeInfo).then(
      () => {
        const msg = `Request to expose service ${exposeInfo.Name} sent.`;
        console.log(msg);
        this.props.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error exposing service ${exposeInfo.Name} - ${error.message}`;
        console.error(msg);
        this.props.addAlert({
          title: msg,
          variant: "danger",
          ariaLive: "assertive",
          ariaRelevant: "additions text",
          ariaAtomic: "false",
        });
      }
    );
  };

  // only put the menu to unexpose a deployment on table rows that are exposed
  actionResolver = (rowData) => {
    if (rowData.data.Exposed !== "No") {
      return this.actions.filter((a) => a.title === "Unexpose");
    }
    return this.actions.filter((a) => a.title === "Expose");
  };

  render() {
    const { showUnexposeModal, unexposeInfo, showExposeModal, exposeInfo } =
      this.state;
    const serviceCount = this.props.service.siteInfo.deployments.length;
    return (
      <div>
        {showUnexposeModal && (
          <UnexposeModal
            {...this.props}
            unexposeInfo={unexposeInfo}
            handleModalClose={this.handleUnexposeClose}
            doUnexpose={this.doUnexpose}
          />
        )}
        {showExposeModal && (
          <ExposeModal
            {...this.props}
            exposeInfo={exposeInfo}
            handleModalClose={this.handleExposeClose}
            doExpose={this.doExpose}
          />
        )}

        {serviceCount === 0 && this.emptyState()}
        {serviceCount > 0 && (
          <TableViewer
            ref={(el) => (this.tableRef = el)}
            {...this.props}
            view="service"
            fields={this.deploymentData.DeploymentFields}
            doFetch={this.fetchDeployments}
            noToolbar
            noFormat
            excludeCurrent={false}
            handleAddNotification={() => {}}
            handleShowSubTable={this.handleShowSubTable}
            actionResolver={this.actionResolver}
          />
        )}
      </div>
    );
  }
}

export default ServiceTable;
