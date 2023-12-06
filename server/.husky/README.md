# Husky Pre-Commit Hooks

This folder contains the [Husky Pre-commit Hooks](https://typicode.github.io/husky/) for the web server.

These pre-commit hooks will abort any attempted commit if any of the hooks fail. They are:

- Verifying that ESLint passes all checks for Typescript and React TSX files
- Verifying that all web server files have been formatted using [Prettier](https://prettier.io/)
- Forcibly formatting the [Prisma Schema File](../prisma/schema.prisma) using the Prisma CLI
