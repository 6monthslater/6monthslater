# Components folder

This folder contains various components that are reused throughout the Remix app.

The root folder contains components designed by us that are reused throughout the whole app.

The `create-report` and `product` folders contain components used by their respective parts of the app.

The `ui` folder contains components provided by [shadcn/ui](https://ui.shadcn.com/).
These components are NOT designed by us - that folder can be treated as if it was a package in
`node_modules`. The reason why it is in this folder is because the creator of shadcn/ui
wants the components to be customizable by the end user, and thus provides the source code
directly instead of providing it as an npm package.

Any shadcn/ui components in their default implementation are in the `ui` folder.

Any shadcn/ui components that have been modified or customized by us are in the `shadcn-ui-mod` folder.
