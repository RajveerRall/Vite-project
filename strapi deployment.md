# Deploying Strapi to a Virtual Droplet

This guide provides a complete, step-by-step process for deploying your Strapi application to a virtual droplet (e.g., DigitalOcean, Vultr, Linode) using Docker and Nginx. This is a robust and professional setup suitable for a production environment.

The core strategy is to **build the application locally** and deploy the finished artifacts. This results in a stable, lean, and fast-starting production server that uses minimal resources.

## Prerequisites

Before you begin, ensure the following software is installed on your virtual droplet:
- **Git**
- **Docker**
- **Docker Compose**
- **Nginx**
- You have a **domain name** pointed at your droplet's IP address.

---

## Step 1: Switch to a Production Database

SQLite is not suitable for production. You must switch to a more robust database like PostgreSQL.

1.  **Install PostgreSQL Driver:**
    On your local machine, add the `pg` driver to your project's dependencies.
    ```bash
    npm install pg
    ```

2.  **Create Production Database Configuration:**
    Create a new file at `config/env/production/database.ts`. This file will tell Strapi how to connect to your PostgreSQL database using environment variables, which is a security best practice.

    ```typescript
    // D:\strapi-backend-neverwrite\neverwrite-blog\config\env\production\database.ts

    export default ({ env }) => ({
      connection: {
        client: 'postgres',
        connection: {
          host: env('DATABASE_HOST', '127.0.0.1'),
          port: env.int('DATABASE_PORT', 5432),
          database: env('DATABASE_NAME', 'strapi'),
          user: env('DATABASE_USERNAME', 'strapi'),
          password: env('DATABASE_PASSWORD'),
          ssl: env.bool('DATABASE_SSL', false),
        },
        debug: false,
      },
    });
    ```

---

## Step 2: Prepare Your Local Project for Deployment

1.  **Run a Final Build:**
    Ensure your project is ready by creating a final local build. This generates the `dist` folder that will be deployed.
    ```bash
    npm run build
    ```

2.  **Commit All Changes:**
    Commit all the changes we've made to your Git repository. This is crucial, as it includes your corrected `Dockerfile`, the new `database.ts` config, and the `dist` folder.
    ```bash
    git add .
    git commit -m "feat: configure project for production deployment"
    git push
    ```

---

## Step 3: Set Up the Droplet

1.  **SSH into your droplet.**

2.  **Clone Your Project:**
    Clone your repository onto the droplet.
    ```bash
    git clone <your-repository-url>
    cd neverwrite-blog
    ```

---

## Step 4: Create `docker-compose.yml`

Inside your project directory on the droplet, create a `docker-compose.yml` file. This file defines how Docker will run your application.

```yaml
# D:\strapi-backend-neverwrite\neverwrite-blog\docker-compose.yml
version: '3.8'

services:
  strapi:
    build: .
    restart: unless-stopped
    environment:
      - DATABASE_CLIENT=postgres
      - DATABASE_HOST=127.0.0.1 # Or your managed database host
      - DATABASE_PORT=${DATABASE_PORT}
      - DATABASE_NAME=${DATABASE_NAME}
      - DATABASE_USERNAME=${DATABASE_USERNAME}
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}
      - APP_KEYS=${APP_KEYS}
      - NODE_ENV=production
    ports:
      - "1337:1337"
    volumes:
      - ./public/uploads:/opt/app/public/uploads
```

---

## Step 5: Create Production `.env` File

On the droplet, create a `.env` file in your project directory. This file will securely provide all your secrets to the Docker container. **Do not commit this file to Git.**

```env
# D:\strapi-backend-neverwrite\neverwrite-blog\.env

# PostgreSQL Database
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=your_db_name
DATABASE_USERNAME=your_db_user
DATABASE_PASSWORD=your_db_password

# Strapi Secrets (Generate new, secure keys for production)
JWT_SECRET=your_new_secure_jwt_secret
ADMIN_JWT_SECRET=your_new_secure_admin_jwt_secret
APP_KEYS=your_new_secure_app_key1,your_new_secure_app_key2
```

---

## Step 6: Configure Nginx as a Reverse Proxy

Do not expose Strapi directly to the internet. Use Nginx to handle traffic and SSL.

1.  **Create an Nginx Configuration File:**
    ```bash
    sudo nano /etc/nginx/sites-available/yourdomain.com
    ```

2.  **Add the Following Configuration:**
    This example redirects HTTP to HTTPS and forwards traffic to your Strapi container.

    ```nginx
    # /etc/nginx/sites-available/yourdomain.com

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com;

        # SSL/TLS Configuration (use Let's Encrypt/Certbot)
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://localhost:1337;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $host;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
        }
    }
    ```

3.  **Enable the Site:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
    sudo nginx -t # Test configuration
    sudo systemctl restart nginx
    ```

---

## Step 7: Deploy!

Now that everything is configured on your droplet:

1.  **Pull the Latest Code:**
    Make sure you have the final version of your code from Git.
    ```bash
    git pull
    ```

2.  **Build and Start the Container:**
    This command will build your Docker image from your `Dockerfile` and start the container in the background.
    ```bash
    docker-compose up --build -d
    ```

Your Strapi application is now successfully deployed and running on your virtual droplet!
