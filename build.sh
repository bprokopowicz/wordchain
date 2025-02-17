echo -e "\nRunning npm install ..."
npm install
echo -e "\nremoving webpack outputs"
rm dist/*-bundled.js
echo -e "\nRunning webpack ..."
webpack --mode production
