# FROM node:20-alpine AS builder
# WORKDIR /app

# RUN corepack enable && corepack prepare yarn@1 --activate

# # Copy package.json and the yarn.lock file
# COPY package.json yarn.lock ./

# # Install all dependencies using yarn.lock (equivalent to npm ci)
# RUN yarn install --frozen-lockfile

# # Copy the rest of the application source code
# COPY . .

# # Build the Vite application using the 'build' script from package.json via yarn
# RUN yarn build

# # Prune dev dependencies to prepare for the final stage
# RUN yarn install --frozen-lockfile --production

# # Stage 2: Create the final production image
# FROM node:20-alpine
# WORKDIR /app

# RUN corepack enable && corepack prepare yarn@1 --activate

# # Copy only the necessary artifacts from the builder stage
# COPY --from=builder /app/package.json /app/yarn.lock ./
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/server.cjs .

# EXPOSE 8080

# HEALTHCHECK --interval=15s --timeout=3s --start-period=5s \
#   CMD node -e "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode == 200 ? 0 : 1)).on('error', () => process.exit(1))"

# CMD [ "yarn", "start" ]

FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@1 --activate

# Copy package.json and the yarn.lock file
COPY package.json yarn.lock ./

# Install all dependencies using yarn.lock (equivalent to npm ci)
RUN yarn install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# --- START: ADDED SECTION FOR BUILD-TIME SECRETS ---
# This ARG instruction tells Docker to expect a build argument named VITE_CLERK_PUBLISHABLE_KEY.
# Fly.io will provide this from your secrets.
ARG VITE_CLERK_PUBLISHABLE_KEY

# This ENV instruction makes the argument available as an environment variable
# for the subsequent RUN commands, specifically 'yarn build'.
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
# --- END: ADDED SECTION ---

# Build the Vite application using the 'build' script from package.json via yarn
# Vite will now have access to VITE_CLERK_PUBLISHABLE_KEY and bake it into the final JS files.
RUN yarn build

# Prune dev dependencies to prepare for the final stage
RUN yarn install --frozen-lockfile --production

# Stage 2: Create the final production image
FROM node:20-alpine
WORKDIR /app

RUN corepack enable && corepack prepare yarn@1 --activate

# Copy only the necessary artifacts from the builder stage
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.cjs .

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode == 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD [ "yarn", "start" ]