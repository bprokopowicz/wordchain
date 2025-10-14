//
// Use:  in any methods, add calls to COV(p, label) with an integer "point" p which indicates
// a place in the code.  'label' should be something like class.method or file.method
// Coverage will keep track of the number of times that place in the
// code is reached, using a counter named class.method.p
//
// At any time, called showCoverage() to print out the counters for each point reached.  
// If we see that a point has non-zero counts but an earlier point doesn't have any count,
// we show that the earlier point was skipped.

let counters = new Map(); // keeps track of execution-counts at code points.
let unreachedFunctions = new Set(); // has all known functions to start.  Remove them as we find counter data, to leave only unconvered functions

// by default, always leave COVERAGE_ON as false, or performance is terrible.  It should only 
// be turned on at runtime for testing, so that we don't accidentally ship with it enabled.

let COVERAGE_ON = false; // DO NOT CHANGE THIS VALUE HERE, EVEN TEMPORARILY.  

export function setCoverage(b) {
    COVERAGE_ON = b;
    if (b) {
        initializeCoveragePointCounters();
    }
}

export function isCoverageOn() {
    return COVERAGE_ON;
}

export function getCounters() {
    if (unreachedFunctions.size == 0) {
        console.log ("function names not loaded yet; try again");
    }
    return counters;
}

async function initializeCoveragePointCounters() {
    const URL = "https:/docs/resources/functions";
       const counterNames = await fetch(URL)
           .then(resp  => resp.text())
           .then(text  => text.split("\n"))
           .then(lines => lines.map((functionName) => {if (functionName.length > 0) unreachedFunctions.add(functionName)}));
}

// Code coverage points are identified as class.method.point, where point is an integer.
export function COV(point, callerStr ) { 
    if (COVERAGE_ON) {
        // it would be nice to get rid of the need for callerStr and have COV figure out the 
        // name of its run-time caller.  But the simple COV.caller.name is not available in strict mode.
        // console.log("COV called from callerStr", callerStr, "COV.caller.name:", COV.caller.name);

        // UGLY!
        let leader = (point < 10) ? "0" : "",
            key = `${callerStr}.${leader}${point}`;

        if (counters.has(key)) {
            counters.set(key, counters.get(key)+1);
        } else {
            counters.set(key, 1);
        }
    }
}

// print out the coverage data and reset the counters
export function showCoverage(appCounters, nonAppCounters) {
    if (COVERAGE_ON) {
        var combinedCounters = new Map([...appCounters]);

        for (let key of nonAppCounters.keys()) {
            if (combinedCounters.has(key)) {
                combinedCounters.set(key, combinedCounters.get(key) + nonAppCounters.get(key));
            } else {
                combinedCounters.set(key, nonAppCounters.get(key));
            }
        }

        const sortedLabels = Array.from(combinedCounters.keys()).sort();

        if (sortedLabels.length === 0) {
            console.log("No coverage recorded. Press Coverage On button on test page, and run some tests!");
            return;
        }

        let curClass = "",
            curFunc = "",
            lastPoint = -1,
            skippedLabels = [];

        // we don't dump all the label counts to the console.  We make an array of them and dump the array, which
        // the tester can open in the console if they want to look at the counts.
        const counterStringsObj = new Object();
        counterStringsObj.counterStrings = [];
        for (let label of sortedLabels) {
            // labels look like class.func.pointNumber
            let [cl, func, pointStr] = label.split('.');
            let point=parseInt(pointStr);

            unreachedFunctions.delete(`${cl}.${func}`);
            if (point === 0) {
                counterStringsObj.counterStrings.push(`${cl}.${func}()`);
            } 
            counterStringsObj.counterStrings.push(`  @ ${point}:  ${combinedCounters.get(label)}`);
            if ((cl == curClass) && (func == curFunc)) {
                // we should see continuity in the points reached.
                // Print out any p st lastPoint < p < point
                for (let p=lastPoint+1; p < point; p++) {
                    skippedLabels.push(`${cl}.${func} @ ${p}`);
                }
                lastPoint = point;
            } else {
                curClass = cl;
                curFunc = func;
                lastPoint = point;
            }
        }
        console.log("coverage point counts:", counterStringsObj);
        console.log("Skipped coverage points:");
        if (skippedLabels.length === 0) {
            console.log("None!");
        } else {
            console.log(skippedLabels.join("\n"));
        }
        console.log("known unreached functions:");
        for (const unreachedFunction of Array.from(unreachedFunctions).sort()) {
            console.log(`'${unreachedFunction}'`);
        }
        console.log(`${100.0 * (1.0 - (skippedLabels.length / sortedLabels.length))}% coverage points reached.`);
        console.log("WARNING: make sure the repo's function catalog docs/resources/functions is up to date");
        console.log("rebuild it with this command: ");
        console.log('cat docs/javascript/*js | grep "^ *const CL =" | sed "s/.*const CL = .//" | sed "s/.;//" > docs/resources/functions');
    }
}

export function clearCoverage() {
    counters = new Map();
}
