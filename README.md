# Validation API

##  Overview

This project is a developer challenge implementation of a **Validation API** that verifies **IP addresses** and **phone numbers** using external validation services and sends an SMS notification to valid phone numbers informing users that their number is safe.
 
It is designed to be fast, reliable, and scalable by leveraging **Redis for caching** and **PostgreSQL for persistent storage**.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
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

## ⚙️ Tech Stack

* **Backend:** NestJS (Node.js, TypeScript)
* **Database:** PostgreSQL (via TypeORM)
* **Cache:** Redis (via CacheModule)
* **External APIs:**

  * IP validation service (IPQualityScore or similar)
  * SMS provider (Twilio)


## 📡 API Endpoints

### Validate IP

```
POST /ip/validate
```

### Validate Phone (and send SMS if valid)

```
POST /phone/validate
```

---

## 🧪 Testing

* **Unit Tests** – Services and business logic
* **E2E Tests** – Full request flow including DB and cache
* External services (Twilio, IP validation)