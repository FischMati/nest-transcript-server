# Nest Transcript Server

Socket.io implementation in NestJS to transcribe speech to text from FE audio.

## Table of Contents

- [Description](#description)
- [Getting Started](#getting-started)
- [Architecture](#architecture)

## Description

This project is a server-side implementation using NestJS and Socket.io to transcribe speech to text from front-end audio. It leverages the power of NestJS for creating efficient, scalable, and enterprise-grade Node.js applications.

## Getting Started

### Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (>= 14.x)
- pnpm (>= 6.x)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/FischMati/nest-transcript-server.git
    cd nest-transcript-server
    ```

2. Install dependencies using pnpm:

    ```bash
    pnpm install
    ```

### Running the Application

To run the application in development mode:

```bash
pnpm run start:dev
```

To build the application:

```bash
pnpm run build
```

To run the application in production mode:

```bash
pnpm run start:prod
```

### Testing

To run tests:

```bash
pnpm run test
```

To run end-to-end tests:

```bash
pnpm run test:e2e
```

To run linting:

```bash
pnpm run lint
```

## Architecture

This project follows a modular architecture, with the following core module:

- **Transcription Module**: Handles the transcription logic.


```` ▋