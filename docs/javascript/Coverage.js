////
// Use:  in any methods, add calls to COV(p) with an integer "point" p which indicates
// a place in the code.  Coverage will keep track of the number of times that place in the
// code is reached, using a counter named class.method.p
//
// At any time, called showCoverage() to print out the counters for each point reached.  
// If we see that a point has non-zero counts but an earlier point doesn't have any count,
// we show that the earlier point was skipped.


// TODO - there is a bug in how statics and globals are managed.  It seems that for some reason,
// simple globals, as well as class statics, have two or more instances, maybe depending on the 
// class loader.  For tests that run using the scheduler, and show their results after the last
// scheduled test, the counters are empty.  But during the test, we see the counters incrementing.
// It seems like there are two counters maps.  

let counters = null; // keeps track of execution-counts at code points.

// by default, always leave COVERAGE_ON as false, or performance is terrible.  

let COVERAGE_ON = false;

export function setCoverageOn() {
    console.log("setCoverageOn");
    COVERAGE_ON = true;
}

export function setCoverageOff() {
    console.log("setCoverageOff");
    COVERAGE_ON = false;
}

export function isCoverageOn() {
    return COVERAGE_ON;
}

export function getCounters() {
    if (counters === null) {
        counters = new Map();
        // const dummyObj = {};
        // Error.captureStackTrace(dummyObj); 
        // console.log("Created new counters map, called from:", dummyObj.stack);
    }
    return counters;
}

// Code coverage points are identified as class.method.point, where point is an integer.
export function COV(point, callerStr ) { 
    if (COVERAGE_ON) {
        // UGLY!
        let leader = (point < 10) ? "0" : "",
            key = `${callerStr}.${leader}${point}`;

        if (getCounters().has(key)) {
            getCounters().set(key, getCounters().get(key)+1);
        } else {
            getCounters().set(key, 1);
        }
    }
}

// print out the coverage data and reset the counters
export function showCoverage(appCounters, nonAppCounters) {
    console.log("appCounters:", appCounters, "nonAppCounters", nonAppCounters);
    if (COVERAGE_ON) {
        var combinedCounters = new Map([...appCounters]);

        for (let key of nonAppCounters.keys()) {
            if (combinedCounters.has(key)) {
                combinedCounters.set(key, combinedCounters.get(key) + nonAppCounters.get(key));
            } else {
                combinedCounters.set(key, nonAppCounters.get(key));
            }
        }

        const labels = Array.from(combinedCounters.keys()).sort();

        if (labels.length === 0) {
            console.log("No coverage recorded. Make sure COVERAGE_ON is true in Coverage.js, and run some tests!");
            return;
        }

        let curClass = "",
            curFunc = "",
            lastPoint = -1,
            skippedLabels = [];

        for (let label of labels) {
            // labels look like class.func.pointNumber
            let [cl, func, pointStr] = label.split('.');
            let point=parseInt(pointStr);

            if (point === 0) {
                console.log(`${cl}.${func}()`);
            } 
            console.log(`  @ ${point}:  ${combinedCounters.get(label)}`);
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

        console.log("Skipped coverage points:");
        if (skippedLabels.length === 0) {
            console.log("None!");
        } else {
            console.log(skippedLabels.join("\n"));
        }
    }
}

export function clearCoverage() {
    counters = new Map();
}
