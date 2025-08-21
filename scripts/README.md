# Development Scripts

This directory contains standardized scripts for maintaining code quality and consistency across the Laravel React Auth project.

## Available Scripts

### 🧹 cleanup-and-format.sh

**Purpose**: Comprehensive cleanup and formatting workflow that standardizes code quality.

**What it does**:
1. **Cleanup**: Removes temporary files, test artifacts, and leftover development files
2. **JavaScript/React Formatting**: Uses Prettier to format all JS/JSX/CSS files
3. **PHP Formatting**: Uses Laravel Pint to format all PHP files
4. **Validation**: Checks for duplicate migrations, route syntax errors, and common issues
5. **Reporting**: Provides a summary of the cleanup process

**Usage**:
```bash
# Run from project root
./scripts/cleanup-and-format.sh

# Or make it part of your development workflow
npm run format  # (if added to package.json)
```

**When to use**:
- Before committing code
- After implementing new features
- Before production deployment
- During code reviews
- As part of CI/CD pipeline

## Integration Options

### 1. Package.json Scripts
Add to your `package.json`:
```json
{
  "scripts": {
    "format": "./scripts/cleanup-and-format.sh",
    "pre-commit": "./scripts/cleanup-and-format.sh"
  }
}
```

### 2. Git Hooks
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
./scripts/cleanup-and-format.sh
```

### 3. VS Code Tasks
Add to `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Format & Cleanup",
      "type": "shell",
      "command": "./scripts/cleanup-and-format.sh",
      "group": "build",
      "presentation": {
        "reveal": "always"
      }
    }
  ]
}
```

## File Patterns Cleaned

### Temporary Files
- `*.tmp`, `*.bak`, `*.orig`, `*~`
- Test files: `test*.php` (in views), `*.test.js`
- Setup scripts: `*.setup.sh`
- Temporary docs: `*TEMP*.md`, `*TEST*.md`

### Formatted Files
- **JavaScript/React**: All `.js`, `.jsx` files in `resources/js/`
- **CSS**: All `.css` files in `resources/css/`
- **PHP**: All `.php` files in `app/`, `routes/`, `config/`, etc.
- **Config**: JSON files like `package.json`, `jsconfig.json`

## Best Practices

1. **Run before every commit** to maintain code consistency
2. **Review warnings** - the script will flag potential issues
3. **Test after formatting** - ensure functionality isn't broken
4. **Customize as needed** - modify patterns for your specific workflow

## Troubleshooting

### Common Issues

**"NPX not found"**
```bash
# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**"Laravel Pint not found"**
```bash
# Install PHP dependencies
composer install
```

**Permission denied**
```bash
# Make script executable
chmod +x scripts/cleanup-and-format.sh
```

## Customization

To modify the cleanup patterns or add new formatting tools:

1. Edit `scripts/cleanup-and-format.sh`
2. Add new file patterns to the cleanup section
3. Add new formatting tools to the formatting section
4. Update this README with your changes

## Contributing

When adding new scripts:
1. Follow the same structure and naming conventions
2. Include colored output for better user experience
3. Add error handling and validation
4. Update this README
5. Test thoroughly before committing
