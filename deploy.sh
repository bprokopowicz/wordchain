branch=$(git branch | grep '^\*' | awk '{print $2}')
echo -e "\nDeploying to branch: ${branch}"

echo -e "\nCopying dist -bundled.js to -live.js ..."
cp dist/wordchain-bundled.js dist/wordchain-live.js
cp dist/testing-bundled.js dist/testing-live.js

# TODO: Option to create a git tag? 
