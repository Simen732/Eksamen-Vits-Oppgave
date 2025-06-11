const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'public/uploads/profiles');

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
    console.log('Created uploads directory:', uploadsDir);
  }
  
  // Test write permissions
  const testFile = path.join(uploadsDir, 'test-write.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  
  console.log('Upload directory is ready and writable!');
} catch (error) {
  console.error('Error setting up uploads directory:', error.message);
  console.log('\nTo fix this on your VM, run these commands:');
  console.log(`sudo mkdir -p ${uploadsDir}`);
  console.log(`sudo chown -R $USER:$USER ${path.join(__dirname, 'public/uploads')}`);
  console.log(`sudo chmod -R 755 ${path.join(__dirname, 'public/uploads')}`);
}
