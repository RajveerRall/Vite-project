FROM node:20-alpine AS builder
WORKDIR /app

# Ensure corepack is enabled and prepare Yarn v1 (Classic)
RUN corepack enable
RUN corepack prepare yarn@1 --activate

# Copy package.json and the yarn.lock file
COPY package.json yarn.lock ./

# Install all dependencies using yarn.lock (equivalent to npm ci)
# --frozen-lockfile is correct for Yarn v1
RUN yarn install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the Vite application using the 'build' script from package.json via yarn
RUN yarn build

# Stage 2: Create the final production image
FROM node:20-alpine
WORKDIR /app

# Ensure corepack is enabled and prepare Yarn v1 (Classic) again for this stage
RUN corepack enable
RUN corepack prepare yarn@1 --activate

# Copy package.json and yarn.lock again
COPY package.json yarn.lock ./


RUN yarn install --frozen-lockfile --production


COPY --from=builder /app/dist ./dist

COPY server.cjs .

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode == 200 ? 0 : 1)).on('error', () => process.exit(1))"


CMD [ "yarn", "start" ]