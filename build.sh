confirm() {
    message=${1}

    outputMessage "${message}"
    PS3="Type 1 to continue; type 2 to exit: "
    select answer in yes no
    do
        if [[ ${answer} != "yes" ]]
        then
            exit 1
        fi
    done
}

copyBundledToLive() {
    outputMessage "Copying dist \*-bundled.js to \*-live.js ..."
    cp dist/wordchain-bundled.js dist/wordchain-live.js
    cp dist/testing-bundled.js dist/testing-live.js
}

createProdBranch() {
    branchName=$(date "+prod-%Y-%m-%d")

    git status
    confirm "Confirm that exactly 4 files changed and you want to deploy to prod."

    outputMessage "Creating branch '${branchName}'"
    git checkout -b ${branchName}

    git add .
    git commit -m "initial commit on branch ${branchName}"
    git push --set-upstream origin ${branchName}

    outputMessage "Switching to branch 'master'"
    git checkout master
}

makeBundles() {
    outputMessage "Running npm install ..."
    npm install

    outputMessage "Removing webpack outputs"
    rm dist/*-bundled.js

    outputMessage "Running webpack ..."
    webpack --mode production
}

outputError() {
    message=${1}
    echo -e "\nERROR ${message}"
    exit 1
}

outputMessage() {
    message=${1}
    echo -e "\n=====> ${message}"
}

######
# MAIN
######

if [[ ! -f ./build.sh ]]
then
    outputError "You must be in the same directory as this script."
fi

makeBundles

# If we're not deploying, we're done.
if [[ "${1}" != "-d" ]]
then
    exit 0
fi

branch=$(git branch | grep '^\*' | awk '{print $2}')
if [[ "${branch}" != "master" ]]
then
    confirm "Confirm that you want to deploy a hot fix on branch: ${branch}."
    copyBundledToLive
    # TODO: write a function to add/commit/push
else
    copyBundledToLive
    createProdBranch
fi
