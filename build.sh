echo "Testing merge of hot fix"
echo -e "\n\n=====> Running npm install ..."
npm install

echo -e "\n\n=====> Removing webpack outputs"
rm dist/*-bundled.js

echo -e "\n\n=====> Running webpack ..."
webpack --mode production

if [[ "${1}" != "-d" ]]
then
    exit 0
fi

copyBundledToLive() {
    echo -e "\n\n=====> Copying dist \*-bundled.js to \*-live.js ..."
    cp dist/wordchain-bundled.js dist/wordchain-live.js
    cp dist/testing-bundled.js dist/testing-live.js
}

branch=$(git branch | grep '^\*' | awk '{print $2}')
if [[ "${branch}" != "master" ]]
then
    echo -e "\nConfirming that you want to deploy a hot fix on branch: ${branch} ..."

    PS3="Continue? "
    select answer in yes no
    do
        case ${answer} in
            yes)
                copyBundledToLive
                exit 0
                ;;

            no)
                exit 1
                ;;
        esac
    done
else
    copyBundledToLive
fi
