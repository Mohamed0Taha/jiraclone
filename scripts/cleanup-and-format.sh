#!/bin/bash

echo "🧹 Starting cleanup and formatting workflow..."
echo "=========================================="

# Step 1: Clean up temporary files
echo ""
echo "ℹ Step 1: Cleaning up temporary and test files"
echo "----------------------------------------"

find . -name "*.tmp" -not -path "./node_modules/*" -not -path "./vendor/*" -delete 2>/dev/null
find . -name "*.bak" -not -path "./node_modules/*" -not -path "./vendor/*" -delete 2>/dev/null
find . -name "*.orig" -not -path "./node_modules/*" -not -path "./vendor/*" -delete 2>/dev/null
find . -name "*~" -not -path "./node_modules/*" -not -path "./vendor/*" -delete 2>/dev/null

echo "✓ Temporary files cleaned"

# Step 2: Format JavaScript/React code
echo ""
echo "ℹ Step 2: Formatting JavaScript/React code with Prettier"
echo "------------------------------------------------------"

if command -v npx &> /dev/null; then
    npx prettier --write "resources/js/**/*.{js,jsx}" "resources/css/**/*.css" "*.json" --log-level=warn
    echo "✓ JavaScript/React code formatted with Prettier"
else
    echo "✗ NPX not found. Please install Node.js and npm"
    exit 1
fi

# Step 3: Format PHP code
echo ""
echo "ℹ Step 3: Formatting PHP code with Laravel Pint"
echo "---------------------------------------------"

if [ -f "./vendor/bin/pint" ]; then
    ./vendor/bin/pint --quiet
    echo "✓ PHP code formatted with Laravel Pint"
else
    echo "✗ Laravel Pint not found. Please run 'composer install'"
    exit 1
fi

# Step 4: Basic checks
echo ""
echo "ℹ Step 4: Basic cleanup checks"
echo "---------------------------"

# Check routes syntax
php -l routes/web.php > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Routes file syntax is valid"
else
    echo "✗ Routes file has syntax errors"
fi

# Count files
php_files=$(find app/ -name "*.php" | wc -l)
js_files=$(find resources/js/ -name "*.js" -o -name "*.jsx" | wc -l)

echo ""
echo "Project Statistics:"
echo "  - PHP files: $php_files"
echo "  - JS/JSX files: $js_files"

echo ""
echo "=========================================="
echo "✓ Cleanup and formatting workflow completed!"
echo "=========================================="
echo ""
