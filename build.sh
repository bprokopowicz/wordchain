confirm() {
    message=${1}

    outputMessage "${message}"
    PS3="Type 1 to continue; type 2 to exit: "
    select answer in yes no
    do
        if [[ ${answer} != "yes" ]]
        then
            exit 1
        else
            break
        fi
    done
}

createProdBranch() {
    branchName=$(date "+prod-%Y-%m-%d")

    outputMessage "Creating branch '${branchName}'"
    git checkout -b ${branchName}
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

pushTimestampedFiles() {
    timestamp=$(date "+%Y-%m-%d-%H:%M:%S")
    outputMessage "Copying dist \*-bundled.js to \*-${timestamp}.js ..."
    cp dist/wordchain-bundled.js dist/wordchain-${timestamp}.js
    cp dist/testing-bundled.js dist/testing-${timestamp}.js

    updateHtml ${timestamp} indexTemplate.html
    updateHtml ${timestamp} testingTemplate.html

    git status
    confirm "Confirm that there are 2 modified and 4 new files AND that you want to deploy to prod."

    git add .
    git commit -m "build.sh initial commit on branch ${branchName}; automated"
    git push --set-upstream origin ${branchName}
}

# Replace timestamp placeholder with actual current timestamp.
#
# Arguments:
#   - timestamp: string in format: YYYY-MM-DD-HH:MM:SS
#   - template file name: must contain 'Template' which is removed
#     to create the output file name.
#
updateHtml() {
    timestamp=${1}
    htmlTemplate=${2}

    htmlFile=${htmlTemplate/Template/}

    sed -e "s/YYYYMMDDHHMMSS/${timestamp}/" ${htmlTemplate} > ${htmlFile}
}

verifyRepoCleanOrExit() {
    if [[ -n "$(git status --porcelain)" ]]
    then
        outputError "Repo must be clean to proceed!"
    fi
}

######
# MAIN
######

if [[ ! -f ./build.sh ]]
then
    outputError "You must be in the same directory as this script."
fi

if [[ "${1}" != "-d" ]]
then
    makeBundles
    exit 0
fi

branch=$(git branch | grep '^\*' | awk '{print $2}')
if [[ "${branch}" != "master" ]]
then
    outputError "Must be on master branch"
fi

verifyRepoCleanOrExit

makeBundles

git status
confirm "Confirm that there are 2 modified files."

git add .
git commit -m "build.sh adding bundles to master; automated"
git push

createProdBranch
pushTimestampedFiles

# At this point we're on the prod branch.




exit


branch=$(git branch | grep '^\*' | awk '{print $2}')
if [[ "${branch}" != "master" ]]
then
    confirm "Confirm that you want to deploy a hot fix on branch: ${branch}."
    pushTimestampedFiles
    # TODO: write a function to add/commit/push
else
    pushTimestampedFiles
    createProdBranch
fi
