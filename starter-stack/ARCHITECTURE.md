# AWS Deployment Architecture

Deploying the Torque Specification Validator to AWS requires transitioning from a synchronous architecture to an **Event-Driven, Asynchronous Architecture**. This is necessary to handle massive payloads (500 MB ZIPs) and bypass the strict API Gateway 29-second timeout limit.

## 1. Handling Large File Uploads (500MB+ ZIPs)
Passing a 500 MB file directly through API Gateway will fail due to its 10 MB payload limit. 
* **Solution:** We will use the **S3 Presigned URL** pattern.
* **Flow:**
  1. The React Frontend calls the FastAPI Backend (`GET /api/upload-url`) to request an upload URL.
  2. The Backend generates a time-bound S3 Presigned URL and returns it.
  3. The Frontend uploads the 500 MB ZIP file directly to the Amazon S3 bucket, completely bypassing the API Gateway and Backend.

## 2. Bypassing the API Gateway 29-Second Timeout
Processing 200+ XML files will exceed the 29-second API Gateway limit. The validation process must be decoupled from the user request.
* **Solution:** Implement a **Worker Queue** pattern.
* **Flow:**
  1. Once the ZIP file finishes uploading to S3, S3 triggers an event notification that sends a message to an **Amazon SQS** (Simple Queue Service) queue.
  2. A fleet of Background Workers (deployed on **Amazon ECS with AWS Fargate** or a long-running AWS Lambda function) polls the SQS queue.
  3. The Worker picks up the message, downloads the ZIP from S3, extracts the 200+ XML files, parses them, runs the validation logic, and saves the final results to an **Amazon RDS** (PostgreSQL) database.

## 3. Updating the User Interface (Frontend)
Since the upload and processing are completely asynchronous, the Frontend needs to know when the validation is complete.
* **Solution:** We can implement **WebSockets** via API Gateway, or simply use **Polling**.
* **Flow (Polling approach for simplicity):** 1. After the S3 upload finishes, the Frontend transitions to a "Processing..." state.
  2. The Frontend polls a new endpoint (`GET /api/upload-status/{job_id}`) every 3 seconds.
  3. Once the RDS database is updated by the Worker, the endpoint returns the completion status along with the validation results, and the UI renders the final tables.

## 4. Infrastructure Snapshot
* **Frontend Hosting:** Amazon S3 + CloudFront (Static website hosting).
* **API Layer:** Amazon API Gateway + AWS Lambda (FastAPI wrapper using Mangum).
* **Storage:** Amazon S3 (for ZIPs and XMLs).
* **Queue:** Amazon SQS.
* **Processing Workers:** Amazon ECS (Fargate) for heavy ZIP extraction.
* **Database:** Amazon RDS (PostgreSQL) replacing the local SQLite file.