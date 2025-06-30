#!/bin/bash
cd /home/kavia/workspace/code-generation/modernsnake-96173-ef296a2f/snake_game_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

