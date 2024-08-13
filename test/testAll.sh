#!/usr/bin/env /bin/bash

python3 DictTest.py && python3 SolverTest.py && python3 GameTest.py

if [[ ${?} != 0 ]]
then
    echo "====> FAIL!"
else
    echo "====> SUCCESS!"
fi
