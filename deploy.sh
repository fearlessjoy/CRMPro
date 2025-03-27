#!/bin/bash

# Build frontend
echo "Building frontend..."
cd Frontend
npm install
npm run build

# Build backend
echo "Building backend..."
cd ../Backend
npm install --production

# Create deployment directory
echo "Creating deployment directory..."
cd ..
mkdir -p deploy
cp -r Frontend/dist deploy/
cp -r Backend/* deploy/
cp Backend/.env.production deploy/.env

# Create start script
echo "Creating start script..."
cat > deploy/start.sh << 'EOL'
#!/bin/bash
export NODE_ENV=production
node index.js
EOL
chmod +x deploy/start.sh

echo "Deployment package created in 'deploy' directory"
echo "Please upload the contents of the 'deploy' directory to your Hostinger server" 