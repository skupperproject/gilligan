# Installation

The skupper console is installed when skupper is initialized using

`skupper init --enable-console`

## Accessing the console

Access the console via the skupper-controller service (or route if running on openshift).

> `If you initialized skupper with --cluster-local, a route will not be generated automatically. You will need to create a route to the controller manually`

## Securing the console

When you run skupper init you can specify the --console-user and --console-password, otherwise they will be generated (admin and a random password held in secrets/skupper-console-users).

You can also disable authentication by specifying

`--console-auth unsecured`

If you are running on openshift you can use oauth against the openshift console by specifying --console-auth openshift.

## Development

To develop the console code

> `git clone https://github.com/skupperproject/gilligan.git`

> `cd gilligan`

> `yarn install`

> `yarn start`

To test

> `yarn run test`
