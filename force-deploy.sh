#!/bin/bash
echo "Forcing Heroku deployment..."
echo "$(date)" > FORCE_REBUILD_$(date +%s)
git add .
git commit -m "Force rebuild to fix Str::limit error - $(date)"
git push heroku main
echo "Deployment completed"
