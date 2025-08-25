# Conflux Builder Web

A simple web application for managing Conflux Builder projects.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Install dependencies

```bash
bun install
```

### Set up environment variables:

Copy the example environment file.

```bash
cp ./env.example .env
```

### Run the development server

```bash
# migrate database
bun migrate

# run development server
bun --bun run dev
```

### Run test

```bash
# we use vitest to run tests (bun test command will use the bun built-in test runner)
bun run test
```
