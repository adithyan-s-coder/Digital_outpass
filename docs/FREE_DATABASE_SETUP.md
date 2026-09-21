# Free Cloud Database Setup Guide for Render Deployment

This guide explains how to connect your **Smart Outpass System** on **Render** to a **100% Free Forever** cloud database, solving the Railway trial limit problem without requiring a credit card.

---

## Why did Railway Stop Working?

Railway gives a one-time trial credit ($5) that expires after 30 days. When it expires, Railway deletes or suspends your MySQL database, resulting in the error:
> **"Database connection failed"** on your Render application login screen.

---

## Recommended Solution: TiDB Cloud (Serverless)

[TiDB Cloud](https://tidbcloud.com) provides a **Serverless Free Tier** that is:
- **Free Forever**: Does not expire after 30 days.
- **No Credit Card Required**: Sign up with your GitHub or Google account.
- **Generous Limits**: 5 GB storage and 50 million Request Units per month (more than enough for institutional and project use).
- **100% MySQL Compatible**: Runs all SQL schemas, queries, and tables without code modification.
- **High Availability**: Hosted on AWS/GCP and never pauses or shuts down due to inactivity.

---

## Step-by-Step Setup: TiDB Cloud (Takes ~2 Minutes)

### Step 1: Create a Free TiDB Cloud Account
1. Open [https://tidbcloud.com](https://tidbcloud.com) in your browser.
2. Click **Sign In** / **Sign Up** and choose **Continue with GitHub** or **Continue with Google**.
3. No credit card is asked.

### Step 2: Create a Serverless Cluster
1. On the TiDB Cloud dashboard, click **Create Cluster**.
2. Select **Serverless** (Free Tier - \$0/month).
3. Choose your preferred cloud provider and region (e.g., **AWS / Mumbai (ap-south-1)** or **AWS / US East (N. Virginia)**).
4. Click **Create**. Your cluster will be ready in under 30 seconds!

### Step 3: Get Connection Credentials
1. In your cluster dashboard, click the **Connect** button (top right).
2. Choose **Connect with: General** or **MySQL Client**.
3. Set or generate a secure root password and click **Create password**.
   > ⚠️ **Important**: Copy this password immediately and keep it safe!
4. TiDB Cloud will display your credentials:
   - **Host**: e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`
   - **Port**: `4000`
   - **User**: e.g., `3abcdefghij.root`
   - **Database**: `test`
   - **Password**: `<the password you just created>`

---

## Step 4: Configure Render Web Service

1. Open your [Render Dashboard](https://dashboard.render.com).
2. Click on your deployed web service (**`digital-outpass`**).
3. In the left navigation menu, click **Environment**.
4. Update or add the following environment variables:

| Key | Value (from TiDB Cloud) | Example |
|---|---|---|
| `DB_HOST` | TiDB Gateway Host | `gateway01.us-east-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | TiDB Port (usually 4000) | `4000` |
| `DB_USER` | TiDB Username | `3abcdefghij.root` |
| `DB_PASSWORD`| TiDB Password | `your_copied_password` |
| `DB_NAME` | Database name | `test` |
| `SECRET_KEY`| Any random string | `outpass-production-secret-key-2026` |

*(Alternatively, if you prefer using a single URL, you can set `DATABASE_URL` with your full connection string provided by TiDB).*

5. Click **Save Changes**.

---

## Step 5: Verification & Auto-Initialization

1. When you save the environment variables, Render will automatically restart your web service.
2. On startup, the application's `init_db()` function will automatically:
   - Connect to the new database with SSL/TLS encryption.
   - Execute `database/schema.sql` to create all tables (`departments`, `users`, `outpasses`, `outpass_logs`).
   - Populate default sample users and test accounts (`database/sample_data.sql`).
3. Open your Render live URL: `https://digital-outpass.onrender.com`.
4. The login page will now load cleanly without the "Database connection failed" banner!

---

## Default Login Credentials for Testing

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `password123` |
| **HOD** | `hod_cse` | `password123` |
| **Staff/Advisor** | `staff_cse1` | `password123` |
| **Security** | `security1` | `password123` |
| **Student** | `student1` | `password123` |

---

## Alternative 2: Aiven for MySQL (Free Tier)

If you prefer Aiven:
1. Visit [https://aiven.io](https://aiven.io).
2. Sign up for free (no credit card needed).
3. Click **Create Service** -> choose **MySQL** -> select the **Free Plan** (5 GB storage, 1 GB RAM).
4. Copy the Service URI or individual parameters:
   - Host, Port, User (`avnadmin`), Password, Database name (`defaultdb`).
5. Paste these into your Render Environment variables.

---

## Local Testing with the Test Script

To verify your credentials from your machine before or after updating Render:

1. Update `.env` with your new database credentials:
   ```env
   DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=your_prefix.root
   DB_PASSWORD=your_password
   DB_NAME=test
   ```
2. Run the connection test script:
   ```bash
   python scripts/test_db_connection.py
   ```
   You should see:
   ```text
   [SUCCESS] Connected to database successfully!
   [INFO] Server Version: 8.0...-TiDB...
   [INFO] Current Database: test
   ```
