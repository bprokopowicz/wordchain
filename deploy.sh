branch=$(git branch | grep '^\*' | awk '{print $2}')
echo -e "\nConfirming that you want to deploy on branch: ${branch} ..."

PS3="Continue? "
select answer in yes no
do
    case ${answer} in
        yes)
            echo -e "\nCopying dist -bundled.js to -live.js ..."
            cp dist/wordchain-bundled.js dist/wordchain-live.js
            cp dist/testing-bundled.js dist/testing-live.js
            exit
            ;;

        no)
            exit
            ;;
    esac
done


