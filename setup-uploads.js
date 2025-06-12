const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const uploadsDir = path.join(__dirname, 'public/uploads/profiles');
const uploadsBaseDir = path.join(__dirname, 'public/uploads');
const publicDir = path.join(__dirname, 'public');

console.log('Setting up upload directories...');
console.log('Target directory:', uploadsDir);

try {
  // Create directory hierarchy step by step
  [publicDir, uploadsBaseDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
  });
  
  // Test write permissions
  const testFile = path.join(uploadsDir, 'test-write.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  
  console.log('✅ Upload directory is ready and writable!');
  console.log('Directory permissions:', fs.statSync(uploadsDir).mode.toString(8));
  
} catch (error) {
  console.error('❌ Error setting up uploads directory:', error.message);
  
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    console.log('\n🔧 To fix permission issues, run these commands:');
    console.log(`sudo mkdir -p "${uploadsDir}"`);
    console.log(`sudo chmod -R 755 "${uploadsBaseDir}"`);
    console.log(`sudo chown -R $USER:$USER "${uploadsBaseDir}"`);
    
    console.log('\n🔄 Attempting automatic fix...');
    try {
      execSync(`mkdir -p "${uploadsDir}"`, { stdio: 'inherit' });
      execSync(`chmod -R 755 "${uploadsBaseDir}"`, { stdio: 'inherit' });
      console.log('✅ Automatic fix successful!');
      
      // Test again
      const testFile = path.join(uploadsDir, 'test-write.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Upload directory is now working!');
      
    } catch (autoFixError) {
      console.error('❌ Automatic fix failed:', autoFixError.message);
      console.log('\n📝 Manual steps required:');
      console.log('1. Run the sudo commands above');
      console.log('2. Or contact your system administrator');
      process.exit(1);
    }
  } else {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}
