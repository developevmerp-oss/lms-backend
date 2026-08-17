const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'src', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

files.forEach(file => {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // If it already has an interface named exactly like the class (e.g. interface Course extends ...), skip or clean up
  // But wait, the file already has `class ModelName extends Model...`
  const classNameMatch = content.match(/class\s+(\w+)\s+extends\s+Model/);
  if (!classNameMatch) return;
  const className = classNameMatch[1];
  
  if (content.includes(`interface ${className} extends`)) {
    // Already converted (e.g. user.ts)
    return;
  }

  // Find all declare public fields
  const fieldRegex = /^\s*declare\s+public\s+([^:]+):\s+([^;]+);/gm;
  
  let match;
  let interfaceBody = '';
  
  while ((match = fieldRegex.exec(content)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    interfaceBody += `  ${fieldName}: ${fieldType};\n`;
  }
  
  // Remove all declare public fields from the class
  content = content.replace(/^\s*declare\s+public\s+([^:]+):\s+([^;]+);\s*$/gm, '');
  
  // Insert the interface definition right before the class
  const interfaceDefinition = `\ninterface ${className} extends ${className}Attributes {\n${interfaceBody}}\n\n`;
  
  content = content.replace(
    new RegExp(`class\\s+${className}\\s+extends\\s+Model`),
    `${interfaceDefinition}class ${className} extends Model`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Converted ${file} to interface merging.`);
});
