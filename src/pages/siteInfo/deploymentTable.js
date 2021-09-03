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

class DeploymentTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      unexposeInfo: null,
      showUnexposeModal: false,
      exposeInfo: null,
      showExposeModal: false,
    };

    // list of all possible actions to be displayed in each table row's kebob menu
    // this is filtered by this.actionResolver for each row
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

    // helper that fetches the table data and defines the table columns
    this.deploymentData = new DeploymentRows();
  }

  // called periodically by the parent component
  update = () => {
    if (this.tableRef && this.tableRef.update) {
      this.tableRef.update();
    }
  };

  // called after a deployment name is clicked in the deployments table
  handleShowSubTable = (_, subPageInfo) => {
    subPageInfo.card.cardType = "deployment";
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

  // this is displayed if there are no deployments in the site specific information
  emptyState = () => (
    <EmptyState variant={EmptyStateVariant.xs} className="sk-empty-container">
      <EmptyStateIcon icon={SearchIcon} />

      <Title headingLevel="h4" size="md">
        No deployments
      </Title>
      <EmptyStateBody>
        There are no deployments running at this site.
      </EmptyStateBody>
      <EmptyStateSecondaryActions></EmptyStateSecondaryActions>
    </EmptyState>
  );

  // called by tableViewer to get the rows to display
  fetchDeployments = (page, perPage) => {
    const formatterData = {
      expose: this.showExpose,
      unExpose: this.showUnexpose,
    };
    return new Promise((resolve) => {
      this.deploymentData
        .fetch(this.emptyState(), this.props.service, formatterData)
        .then((data) => {
          resolve({ data, page, perPage });
        });
    });
  };

  // called to display the unexpose modal
  showUnexpose = (rowData) => {
    this.setState({
      showUnexposeModal: true,
      // data sent to modal
      unexposeInfo: {
        name: rowData.data.name,
        type: rowData.data.type,
      },
    });
  };

  // called to hide the unexpose modal
  handleUnexposeClose = () => {
    this.setState({ showUnexposeModal: false, unexposeInfo: null });
  };

  // called after the unexpose modal is submitted
  doUnexpose = (unexposeInfo) => {
    this.props.service.unexposeService(unexposeInfo).then(
      () => {
        const msg = `Deployment ${unexposeInfo.name} unexposed successfully`;
        console.log(msg);
        this.props.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error unexposing deployment ${unexposeInfo.name} - ${error.message}`;
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

  // called to display the expose modal
  showExpose = (rowData) => {
    const exposeInfo = {
      name: rowData.data.name,
      ports: rowData.data.ports,
      type: rowData.data.type,
      original: rowData.data,
    };
    this.setState({
      showExposeModal: true,
      exposeInfo,
    });
  };

  // called to hide the expose modal
  handleExposeClose = () => {
    this.setState({ showExposeModal: false, exposeInfo: null });
  };

  // this is called after the expose modal is submitted
  doExpose = (exposeInfo) => {
    const exposeData = {
      address: exposeInfo.name,
      protocol: exposeInfo.protocol,
      target: { name: exposeInfo.original.name, type: exposeInfo.type },
    };

    const parsedPort = parseInt(exposeInfo.port, 10);
    if (!isNaN(parsedPort)) {
      exposeData.port = parsedPort;
    }

    this.props.service.exposeService(exposeData).then(
      () => {
        const msg = `Request to expose service ${exposeData.address} sent.`;
        console.log(msg);
        this.props.addAlert({
          title: msg,
          variant: "success",
          isLiveRegion: true,
        });
      },
      (error) => {
        const msg = `Error exposing deployment ${exposeData.address} - ${error.message}`;
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

  // called by patternfly's table component
  // only put the menu to unexpose a deployment on table rows that are exposed
  actionResolver = (rowData) => {
    if (rowData.data.exposed !== this.deploymentData.unexposedValue) {
      return this.actions.filter((a) => a.title === "Unexpose");
    }
    return this.actions.filter((a) => a.title === "Expose");
  };

  render() {
    const { showUnexposeModal, unexposeInfo, showExposeModal, exposeInfo } =
      this.state;
    const serviceCount = this.props.service.siteInfo.services.length;
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
            view="deployment"
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

export default DeploymentTable;
