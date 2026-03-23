# Validation API

##  Overview

This project is a developer challenge implementation of a **Validation API** that verifies **IP addresses** and **phone numbers** using external validation services and sends an SMS notification to valid phone numbers informing users that their number is safe.
 
It is designed to be fast, reliable, and scalable by leveraging **Redis for caching** and **PostgreSQL for persistent storage**.

## Project setup

```bash
$ npm install
```

This project requires environment configuration files to run properly:

.env — contains configuration for local development
.env.test — contains configuration for the test environment

These files are not included in the repository for security reasons.

> ⚠️ **Important:** If you want to run the project or the integration tests locally, please contact me to receive the necessary `.env` and `.env.test` files.
>
> Additionally, you need to create the Postgres and Redis databases in Docker containers. The commands to do this are simple one-liners, and I will share them together with the `.env` files.

Once you have the files, place them in the project root directory.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Tech Stack

* **Backend:** NestJS (Node.js, TypeScript)
* **Database:** PostgreSQL (via TypeORM)
* **Cache:** Redis (via CacheModule)
* **External APIs:**

  * IP and Phone validation service (IPQualityScore)
  * SMS provider (Twilio)


## API Endpoints

### Validate IP

```
POST /validate/ip
```

### Validate Phone (and send SMS if valid)

```
POST /validate/phone
```

---

## 🧪 Testing

* **Unit Tests** – Services and business logic
* **E2E Tests** – Full request flow including DB and cache
* External services (Twilio, IPQS)