# Example title

[![Build Status](https://travis-ci.org/skupperproject/skupper-example-xxx.svg?branch=master)](https://travis-ci.org/skupperproject/skupper-example-xxx)

> In this section, describe the scenario that is being
> demonstrated. The scenario should be defined with enough detail that
> there are no decision points for the user. After the description,
> include a simple TOC.

To complete this tutorial, do the following:

* [Prerequisites](#prerequisites)
* [Step 1: Procedure title](#step-1-procedure-title)
* [Step 2: Another procedure](#step-2-another-procedure)
* [Next steps](#next-steps)

## Prerequisites

> Based on the scenario that you described above, determine the state
> the user should have in order to begin the procedures. State each
> prerequisite as a condition or requirement. For example:

You must have access to two Kubernetes clusters:

* A "private cloud" cluster running on your local machine
* A cluster running on a public cloud provider

## Step 1: Procedure title

> Break the tutorial into discrete procedures. Each procedure should
> cover a single logical "chunk" of work. The procedure should start
> with a short intro that explains why the user should care about the
> procedure, and then a set of numbered steps. As a general rule of
> thumb, try to keep each procedure to eight or fewer steps. For
> example:

The application router network provides connectivity across the three
clusters without the need for special network and firewall
configuration rules.

1. Open the
   `mongodb-replica-demo/demos/topology2/skoot-topology2.conf` file.

2. Replace the variables with the names of your OpenShift clusters and
   namespaces.

   <dl>
   <dt>${OPENSHIFT_CLUSTER_NAME_1}</dt>
   <dd>The name of the first public cloud cluster.</dd>
   <dt>${NAMESPACE_1}</dt>
   <dd>The name of the namespace on the first public cloud cluster.</dd>
   <dt>${OPENSHIFT_CLUSTER_NAME_2}`</dt>
   <dd>The name of the second public cloud cluster.</dd>
   <dt>${NAMESPACE_2}</dt>
   <dd>The name of the namespace on the second public cloud cluster.</dd>
   <dt>${NAMESPACE_3}</dt>
   <dd>The name of the namespace on the private cloud cluster that is running on your local machine.</dd>
   </dl>

3. Use `skoot` to create the application router network.

   ```bash
   $ cd ~/mongodb-replica-demo/skoot/python/tools
   $ source export_path.sh
   $ skoot -c -o ~/mongodb-replica-demo/demos/topology2/skoot-topology2.conf
   ```

## Step 2: Another procedure

## Next steps

> Describe anything that the user might want to do next after
> completing the tutorial. This could include links to concepts that
> might be of interest, or links to other tutorials that build off of
> this tutorial.
